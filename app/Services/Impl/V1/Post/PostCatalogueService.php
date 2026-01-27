<?php  
namespace App\Services\Impl\V1\Post;
use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\Post\PostCatalogueServiceInterface;
use App\Services\Interfaces\Post\PostServiceInterface;
use App\Repositories\Post\PostCatalogueRepo;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Services\Interfaces\NestedSetInterface;
use App\Traits\HasNestedset;
use App\Traits\HasRouter;
use App\Services\Impl\V1\Cache\BaseCacheService;
use Illuminate\Http\Request;


class PostCatalogueService extends BaseCacheService implements PostCatalogueServiceInterface {

    use HasNestedset, HasRouter;

    // Cache strategy: 'default' phù hợp cho post_catalogues vì ít thay đổi và cần cache lâu dài
    protected string $cacheStrategy = 'default';
    protected string $module = 'post_catalogues';

    protected $repository;

    protected $with = ['creators', 'current_languages', 'languages'];
    protected $simpleFilter = ['publish', 'user_id'];
    protected $complexFilter = ['lft', 'rgt']; // Để filter nested set
    protected $searchFields = ['name', 'description'];
    protected $isMultipleLanguage = true; // Search trong pivot table post_catalogue_language
    protected $pivotTable = 'post_catalogue_language'; // Tên bảng pivot cho search
    protected $pivotForeignKey = 'post_catalogue_id'; // Foreign key trong pivot table
    protected $sort = ['lft', 'asc'];

    // protected $pivotFields = [
    //     'extends' => [''],
    //     'except' => ['']
    // ];
    
    // protected $languageFields = [
    //     'extends' => ['abc'],
    //     'except' => ['meta_title']
    // ];
    

    // protected $perpage = ;

    public function __construct(
        PostCatalogueRepo $repository
    )
    {
        $this->repository = $repository;
        $this->initNestedset(['table' => $this->module, 'foreigKey' => 'post_catalogue_id', 'pivotTable' => 'post_catalogue_language']);
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        return $this;
    }

    protected function beforeSave(): static
    {
        $this->handlePivotLanguageFields();
        return $this;
    }

    protected function beforeDelete($id): static
    {
        // Model đã được load trong destroy() method, chỉ load lại nếu chưa có
        if(!$this->model){
            parent::beforeDelete($id);
        }
        
        // Kiểm tra xem có danh mục con không bằng nested set (rgt - lft > 1)
        // Trong nested set, nếu rgt - lft > 1 thì có danh mục con
        if($this->model && isset($this->model->lft) && isset($this->model->rgt)){
            $hasChildren = ($this->model->rgt - $this->model->lft) > 1;
            
            if($hasChildren){
                throw new \Exception('Không thể xóa danh mục này vì còn danh mục con. Vui lòng xóa tất cả danh mục con trước.');
            }
        }
        
        return $this;
    }

    protected function afterSave(): static
    {
        $this->syncRouter($this->module, 'PostCataloguePage', 'App\Http\Controllers\Frontend\Post\PostCatalogueController');
        $this->runNestedSet();
        return parent::afterSave();
    }

    protected function afterDelete(): static
    {
        $catalogueId = $this->model->id;
        
        // 1. Xóa hard delete router của danh mục
        $this->deleteRouter();
        
        // 2. Xử lý các items liên quan (posts, products, etc.)
        $this->handleRelatedItemsOnCatalogueDelete($catalogueId);
        
        
        // 3. Cập nhật nested set
        $this->runNestedSet();
        
        // 4. Clear cache (invalidateCache đã tự động gọi invalidatePaginateCache)
        $this->invalidateCache();
        
        return parent::afterDelete();
    }


    protected function afterBulkDestroy(): static
    {
        $this->runNestedSet();
        return $this;
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
                        // Các relation khác vẫn dùng sync() bình thường
                        $this->model->{$relation}()->sync($this->request->{$relation});
                    }
                }
            }
        }
        
        return $this;
    }
}
