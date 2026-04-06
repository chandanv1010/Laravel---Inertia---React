<?php  
namespace App\Services\Impl\V1\Order;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\Order\OrderServiceInterface;
use App\Services\Interfaces\Inventory\InventoryServiceInterface;
use App\Repositories\Order\OrderRepo;
use Illuminate\Http\Request;
use App\Models\Order;
use Illuminate\Support\Facades\Log;

class OrderService extends BaseService implements OrderServiceInterface {
    
    protected $repository;
    protected $inventoryService;
    protected $simpleFilter = ['payment_status', 'order_status'];
    protected $complexFilter = ['id', 'customer_id'];
    protected $searchFields = ['order_code', 'customer_name', 'customer_phone'];

    public function __construct(
        OrderRepo $repository,
        InventoryServiceInterface $inventoryService
    )
    {
        $this->repository = $repository;
        $this->inventoryService = $inventoryService;
        parent::__construct($repository);
    }

    /**
     * Prepare model data for save/update
     * 
     * @return static
     */
    protected function prepareModelData(): static
    {
        $this->modelData = $this->request->only([
            'order_status',
            'payment_status',
            'shipping_address',
            'notes'
        ]);
        
        return $this;
    }

    /**
     * Hook xử lý sau khi lưu đơn hàng thành công
     */
    protected function afterSave(): static
    {
        if (!$this->model) return $this;

        // Kiểm tra thay đổi trạng thái đơn hàng
        if ($this->model->wasChanged('order_status')) {
            $newStatus = $this->model->order_status;
            $oldStatus = $this->model->getOriginal('order_status');

            Log::info("Order status changed from {$oldStatus} to {$newStatus} for Order ID: " . $this->model->id);

            // 1. Nếu chuyển sang Cancelled: Hoàn tồn kho
            if ($newStatus === 'cancelled') {
                try {
                    $this->inventoryService->restoreOrderInventory($this->model);
                    Log::info("Inventory restored successfully for cancelled order ID: " . $this->model->id);
                } catch (\Exception $e) {
                    Log::error("Failed to restore inventory for order ID: " . $this->model->id . " Error: " . $e->getMessage());
                }
            }

            // 2. Logic bổ sung (Gửi mail thông báo, v.v...)
        }

        return $this;
    }

    /**
     * Get order by code with relations
     * 
     * @param string $code
     * @return Order|null
     */
    public function getOrderByCode(string $code)
    {
        return $this->repository->getModel()->with(['orderItems', 'paymentMethod'])->where('order_code', $code)->first();
    }

    /**
     * Override show to include relations for Admin
     */
    public function show($id, $relations = ['orderItems', 'paymentMethod'])
    {
        return $this->repository->findById($id, ['*'], $relations);
    }
}

