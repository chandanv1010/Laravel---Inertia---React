<?php  
namespace App\Services\Impl\V1\PaymentMethod;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\PaymentMethod\PaymentMethodServiceInterface;
use App\Repositories\PaymentMethod\PaymentMethodRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class PaymentMethodService extends BaseService implements PaymentMethodServiceInterface {

    protected $repository;

    protected $with = [];
    protected $simpleFilter = ['type', 'status'];
    protected $searchFields = ['name', 'code', 'provider'];
    protected $sort = ['order', 'asc'];

    public function __construct(
        PaymentMethodRepo $repository
    )
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        
        // Luôn set user_id từ Auth
        if(!$this->skipBeforeSave){
            $this->modelData['user_id'] = Auth::id();
        }

        // Xử lý config nếu có
        if($this->request->has('config') && is_array($this->request->input('config'))){
            $this->modelData['config'] = $this->request->input('config');
        }

        // Xử lý is_default: nếu set default, bỏ default của các phương thức khác
        if($this->request->has('is_default') && $this->request->boolean('is_default')){
            $this->repository->getModel()->where('is_default', true)->update(['is_default' => false]);
        }
        
        return $this;
    }

    protected function beforeSave(): static {
        return $this;
    }

    protected function afterSave(): static {
        return parent::afterSave();
    }

    /**
     * Kết nối phương thức thanh toán tích hợp
     */
    public function connect(array $data)
    {
        $this->beginTransaction();
        
        try {
            $request = new Request($data);
            $this->setRequest($request);
            
            // Tìm hoặc tạo payment method
            $code = $data['code'] ?? null;
            $provider = $data['provider'] ?? null;
            
            if(!$code || !$provider){
                throw new \Exception('Code và Provider là bắt buộc');
            }

            $paymentMethod = $this->repository->getModel()
                ->where('code', $code)
                ->where('provider', $provider)
                ->first();

            if($paymentMethod){
                // Update existing
                $this->model = $paymentMethod;
                $this->modelData = array_merge($data, [
                    'type' => 'integrated',
                    'status' => 'active',
                    'user_id' => Auth::id(),
                ]);
                $this->model->update($this->modelData);
            } else {
                // Create new
                $this->modelData = array_merge($data, [
                    'type' => 'integrated',
                    'status' => 'active',
                    'user_id' => Auth::id(),
                ]);
                $this->model = $this->repository->getModel()->create($this->modelData);
            }

            $this->commit();
            return $this->model;
        } catch (\Throwable $th) {
            $this->rollback();
            throw $th;
        }
    }

    /**
     * Ngắt kết nối phương thức thanh toán tích hợp
     */
    public function disconnect(int $id): bool
    {
        $this->beginTransaction();
        
        try {
            $paymentMethod = $this->repository->findById($id);
            
            if(!$paymentMethod || $paymentMethod->type !== 'integrated'){
                throw new \Exception('Phương thức thanh toán không hợp lệ');
            }

            // Xóa config và set status = inactive
            $paymentMethod->update([
                'config' => null,
                'status' => 'inactive',
                'is_default' => false,
            ]);

            $this->commit();
            return true;
        } catch (\Throwable $th) {
            $this->rollback();
            return false;
        }
    }

    /**
     * Đặt phương thức thanh toán mặc định
     */
    public function setDefault(int $id): bool
    {
        $this->beginTransaction();
        
        try {
            $paymentMethod = $this->repository->findById($id);
            
            if(!$paymentMethod || $paymentMethod->status !== 'active'){
                throw new \Exception('Phương thức thanh toán không hợp lệ');
            }

            // Bỏ default của tất cả phương thức khác
            $this->repository->getModel()->where('is_default', true)->update(['is_default' => false]);
            
            // Set default cho phương thức này
            $paymentMethod->update(['is_default' => true]);

            $this->commit();
            return true;
        } catch (\Throwable $th) {
            $this->rollback();
            return false;
        }
    }

    /**
     * Lấy danh sách phương thức tích hợp
     */
    public function getIntegratedMethods(): array
    {
        return $this->repository->getModel()
            ->where('type', 'integrated')
            ->orderBy('order')
            ->get()
            ->map(function ($method) {
                return [
                    'id' => $method->id,
                    'name' => $method->name,
                    'code' => $method->code,
                    'type' => $method->type,
                    'status' => $method->status,
                    'is_default' => $method->is_default,
                    'provider' => $method->provider,
                    'config' => $method->config,
                    'description' => $method->description,
                    'icon' => $method->icon,
                    'order' => $method->order,
                ];
            })
            ->toArray();
    }

    /**
     * Lấy danh sách phương thức thủ công
     */
    public function getManualMethods(): array
    {
        return $this->repository->getModel()
            ->where('type', 'manual')
            ->orderBy('order')
            ->get()
            ->map(function ($method) {
                return [
                    'id' => $method->id,
                    'name' => $method->name,
                    'code' => $method->code,
                    'type' => $method->type,
                    'status' => $method->status,
                    'is_default' => $method->is_default,
                    'provider' => $method->provider,
                    'config' => $method->config,
                    'description' => $method->description,
                    'icon' => $method->icon,
                    'order' => $method->order,
                ];
            })
            ->toArray();
    }

    /**
     * Lấy phương thức thanh toán mặc định
     */
    public function getDefaultMethod(): ?array
    {
        $method = $this->repository->getModel()
            ->where('is_default', true)
            ->where('status', 'active')
            ->first();

        if (!$method) {
            return null;
        }

        return [
            'id' => $method->id,
            'name' => $method->name,
            'code' => $method->code,
            'type' => $method->type,
            'status' => $method->status,
            'is_default' => $method->is_default,
            'provider' => $method->provider,
            'config' => $method->config,
        ];
    }
}

