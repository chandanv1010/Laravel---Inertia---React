<?php  
namespace App\Services\Impl\V1\Customer;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Customer\CustomerCatalogueServiceInterface;
use App\Repositories\Customer\CustomerCatalogueRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use App\Helpers\DropdownHelper;

class CustomerCatalogueService extends BaseCacheService implements CustomerCatalogueServiceInterface {

    // Cache strategy: 'default' phù hợp cho customer_catalogues vì ít thay đổi
    protected string $cacheStrategy = 'default';
    protected string $module = 'customer_catalogues';

    protected $repository;

    protected $with = ['creators'];
    protected $simpleFilter = ['publish', 'user_id'];
    protected $searchFields = ['name', 'description'];
    protected $sort = ['order', 'asc'];

    public function __construct(
        CustomerCatalogueRepo $repository
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

    public function getDropdown()
    {
        // Sử dụng paginate với type='all' để tận dụng cache strategy
        // Tuân thủ nghiêm ngặt: phải gọi paginate() để tận dụng cache
        $request = new Request([
            'type' => 'all',
            'publish' => '2',
            'sort' => 'order,asc' // Sử dụng sort mặc định của service
        ]);
        
        $records = $this->paginate($request);

        // Sử dụng DropdownHelper, CustomerCatalogue không phải multiple language
        return DropdownHelper::transform($records, [
            'valueKey' => 'id',
            'labelKey' => 'name',
            'isMultipleLanguage' => false,
        ]);
    }
}
