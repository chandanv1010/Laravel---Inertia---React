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
        
        // Log request data for debugging persistence issues
        \Illuminate\Support\Facades\Log::info('Customer prepareModelData', [
            'guard_web_check' => \Illuminate\Support\Facades\Auth::guard('web')->check(),
            'guard_customer_check' => \Illuminate\Support\Facades\Auth::guard('customer')->check(),
            'request_data' => $this->request->all(),
            'model_data' => $this->modelData,
            'is_update' => (bool)($this->request->route('id') || $this->request->input('id'))
        ]);

        // Mặc định customer_catalogue_id = 1 chỉ khi tạo mới
        if (!isset($this->modelData['customer_catalogue_id']) || empty($this->modelData['customer_catalogue_id'])) {
            $isUpdate = $this->request->route('id') || $this->request->input('id');
            if (!$isUpdate) {
                $this->modelData['customer_catalogue_id'] = 1;
            }
        }

        // Chỉ gán user_id nếu là người dùng Web (Admin/Staff) đang thao tác
        // KHÔNG gán user_id nếu khách hàng đang tự cập nhật mình (guard customer)
        if (\Illuminate\Support\Facades\Auth::guard('web')->check()) {
            $this->modelData['user_id'] = \Illuminate\Support\Facades\Auth::guard('web')->id();
        } else {
            // Nếu không phải admin, không cho phép cập nhật user_id qua request
            unset($this->modelData['user_id']);
        }
        
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

    /**
     * Cập nhật mật khẩu cho khách hàng
     */
    public function updatePassword(Request $request, int $id): bool
    {
        $request->validate([
            'old_password' => 'required',
            'password' => 'required|confirmed|min:6',
        ]);

        $customer = $this->repository->findById($id);

        if (!\Illuminate\Support\Facades\Hash::check($request->old_password, $customer->password)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'old_password' => 'Mật khẩu cũ không chính xác.',
            ]);
        }

        return $this->repository->update($id, [
            'password' => $request->password
        ]) ? true : false;
    }
}
