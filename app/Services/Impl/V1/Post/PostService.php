<?php  
namespace App\Services\Impl\V1\Post;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Post\PostServiceInterface;
use App\Services\Interfaces\Post\PostCatalogueServiceInterface;
use App\Repositories\Post\PostRepo;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Traits\HasRouter;
use App\Traits\HasRelationMerge;
use App\Traits\HasCatalogueFilter;
use Illuminate\Http\Request;

class PostService extends BaseCacheService implements PostServiceInterface {

    use HasRouter, HasRelationMerge, HasCatalogueFilter;

    protected $repository;
    protected $postCatalogueService;

    // Cache strategy: 'dataset' phù hợp cho posts vì có nhiều filter và search
    protected string $cacheStrategy = 'dataset';
    protected string $module = 'posts';
    
    // Catalogue filter config - tái sử dụng từ trait HasCatalogueFilter
    protected string $catalogueFilterField = 'post_catalogue_id';
    protected string $catalogueMainRelationKey = 'post_catalogue_id';
    protected string $cataloguePivotRelationName = 'post_catalogues';
    protected string $catalogueTable = 'post_catalogues';

    protected $with = ['creators', 'current_languages', 'post_catalogue', 'post_catalogues.current_languages', 'languages'];
    protected $simpleFilter = ['publish', 'user_id']; // post_catalogue_id sẽ được xử lý đặc biệt trong PostRepo
    protected $searchFields = ['name', 'description'];
    protected $isMultipleLanguage = true; // Search trong pivot table post_language
    protected $pivotTable = 'post_language'; // Tên bảng pivot cho search
    protected $pivotForeignKey = 'post_id'; // Foreign key trong pivot table
    protected $sort = ['id', 'desc'];

    // Pivot fields cho language
    protected $pivotFields = [
        'extends' => [],
        'except' => []
    ];

    // Language fields
    protected $languageFields = [
        'extends' => [],
        'except' => []
    ];

    public function __construct(
        PostRepo $repository,
        PostCatalogueServiceInterface $postCatalogueService
    )
    {
        $this->repository = $repository;
        $this->postCatalogueService = $postCatalogueService;
        $this->catalogueService = $postCatalogueService; // Set cho trait HasCatalogueFilter
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        
        // Luôn set user_id từ Auth (trừ khi toggle đã skip beforeSave)
        if(!$this->skipBeforeSave){
            $this->modelData['user_id'] = Auth::id();
        }
        
        // Xử lý post_catalogue_id: nếu có thì set
        if($this->request->has('post_catalogue_id')){
            $this->modelData['post_catalogue_id'] = $this->request->input('post_catalogue_id') ?: null;
        }
        
        return $this;
    }

    protected function beforeSave(): static {
        // Chỉ xử lý language pivot fields nếu có language fields trong request
        // Tránh lỗi khi chỉ update order hoặc publish
        if($this->request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'meta_keyword', 'meta_description'])){
            $this->handlePivotLanguageFields();
        }
        
        // Chuẩn bị dữ liệu post_catalogues: merge post_catalogue_id vào post_catalogues array
        // Để withRelation có thể sync đúng (withRelation chạy trước afterSave)
        $this->mergeMainRelationToPivot('post_catalogue_id', 'post_catalogues');
        
        return $this;
    }

    protected function afterSave(): static {
        // Tạo router cho post - chỉ khi có canonical (tránh lỗi khi chỉ update order/publish)
        if($this->request->has('canonical') || ($this->model && $this->model->routers)){
            $this->syncRouter($this->module, 'PostPage', 'App\Http\Controllers\Frontend\Post\PostController');
        }
        
        return parent::afterSave();
    }

    /**
     * Override paginate để xử lý filter catalogue với nested set
     * Sử dụng trait HasCatalogueFilter để tái sử dụng logic
     */
    public function paginate(Request $request){
        $this->setRequest($request);
        $specifications = $this->specifications();
        
        // Xử lý filter catalogue với nested set - logic từ trait
        $specifications = $this->handleCatalogueFilter($specifications);
        
        // Gọi parent paginate (có cache)
        return parent::paginate($request);
    }

    /**
     * Override specifications để merge catalogue_ids từ request vào filter
     * Sử dụng trait HasCatalogueFilter để tái sử dụng logic
     */
    protected function specifications(): array {
        $specs = parent::specifications();
        
        // Merge catalogue_ids từ trait
        $specs = $this->mergeCatalogueIdsToSpecs($specs);
        
        return $specs;
    }

    /**
     * Override withRelation để xử lý đặc biệt cho languages relation
     * Sử dụng syncWithoutDetaching để không xóa các bản dịch đã có
     */
    protected function withRelation(): static {
        $relationable = $this->repository->getRelationable() ?? [];
        
        if(count($relationable)){
            foreach($relationable as $relation){
                if($this->request->has($relation)){
                    // Xử lý đặc biệt cho languages relation
                    if($relation === 'languages'){
                        // Sử dụng syncWithoutDetaching để không xóa các languages đã có
                        // Chỉ update hoặc attach language mới (ngôn ngữ hiện tại)
                        $this->model->{$relation}()->syncWithoutDetaching($this->request->{$relation});
                    } else {
                        // Các relation khác (như post_catalogues) vẫn dùng sync() bình thường
                        $this->model->{$relation}()->sync($this->request->{$relation});
                    }
                }
            }
        }
        
        return $this;
    }

}
