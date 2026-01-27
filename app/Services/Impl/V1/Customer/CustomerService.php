<?php  
namespace App\Services\Impl\V1\Customer;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Customer\CustomerServiceInterface;
use App\Repositories\Customer\CustomerRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class CustomerService extends BaseCacheService implements CustomerServiceInterface {

    // Cache strategy: 'dataset' phù hợp cho customers vì có nhiều filter và search
    protected string $cacheStrategy = 'dataset';
    protected string $module = 'customers';

    protected $repository;

    protected $with = ['creators', 'customer_catalogue'];
    protected $simpleFilter = ['publish', 'user_id', 'customer_catalogue_id', 'gender'];
    protected $searchFields = ['first_name', 'last_name', 'email', 'phone'];
    protected $sort = ['id', 'desc'];

    public function __construct(
        CustomerRepo $repository
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
        $request = new Request([
            'type' => 'all',
            'publish' => '2',
            'sort' => 'id,desc'
        ]);
        $records = $this->paginate($request);
        
        return $records->map(function($record) {
            return [
                'value' => $record->id,
                'label' => trim(($record->last_name ?? '') . ' ' . ($record->first_name ?? '')) ?: $record->email,
            ];
        })->toArray();
    }
}
