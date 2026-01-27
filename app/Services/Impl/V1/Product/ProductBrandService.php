<?php  
namespace App\Services\Impl\V1\Product;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Product\ProductBrandServiceInterface;
use App\Repositories\Product\ProductBrandRepo;
use Illuminate\Support\Facades\Auth;
use App\Traits\HasRouter;
use Illuminate\Http\Request;
use App\Helpers\DropdownHelper;

class ProductBrandService extends BaseCacheService implements ProductBrandServiceInterface {

    use HasRouter;

    // Cache strategy: 'default' phù hợp cho product_brands vì ít thay đổi
    protected string $cacheStrategy = 'default';
    protected string $module = 'product_brands';

    protected $repository;

    protected $with = ['creators', 'current_languages', 'languages'];
    protected $simpleFilter = ['publish', 'user_id'];
    protected $searchFields = ['name', 'description'];
    protected $isMultipleLanguage = true; // Search trong pivot table product_brand_language
    protected $pivotTable = 'product_brand_language'; // Tên bảng pivot cho search
    protected $pivotForeignKey = 'product_brand_id'; // Foreign key trong pivot table
    protected $sort = ['id', 'desc'];

    public function __construct(
        ProductBrandRepo $repository
    )
    {
        $this->repository = $repository;
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
        // Chỉ xử lý language pivot fields nếu có language fields trong request
        // Tránh lỗi khi chỉ update order hoặc publish
        if($this->request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'meta_keyword', 'meta_description'])){
            $this->handlePivotLanguageFields();
        }
        return $this;
    }

    protected function afterSave(): static
    {
        // Tạo router cho product_brand - chỉ khi có canonical
        if($this->request->has('canonical') || ($this->model && $this->model->routers)){
            $this->syncRouter($this->module, 'ProductBrandPage', 'App\Http\Controllers\Frontend\Product\ProductBrandController');
        }
        return parent::afterSave();
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

    public function getDropdown()
    {
        // Sử dụng paginate với type='all' để tận dụng cache strategy
        $request = new Request([
            'type' => 'all',
            'publish' => '2',
            'sort' => 'order,asc'
        ]);
        
        $records = $this->paginate($request);

        // Sử dụng DropdownHelper để transform, tự động detect multiple language
        return DropdownHelper::transform($records, [
            'valueKey' => 'id',
            'isMultipleLanguage' => true, // ProductBrand là multiple language
        ]);
    }
}

