<?php  
namespace App\Services\Impl\V1\Order;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Order\OrderServiceInterface;
use App\Services\Interfaces\Inventory\InventoryServiceInterface;
use App\Repositories\Order\OrderRepo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\Order;
use App\Models\CashReason;
use App\Models\CashTransaction;
use Exception;

class OrderService extends BaseCacheService implements OrderServiceInterface {
    
    protected $repository;
    protected $inventoryService;
    protected string $cacheStrategy = 'dataset';
    protected string $module = 'orders';
    protected $simpleFilter = ['payment_status', 'order_status'];
    protected $complexFilter = ['id', 'customer_id'];
    protected $searchFields = ['order_code', 'customer_name', 'customer_phone'];
    protected $oldStatus = null;

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
     * Hook xử lý trước khi lưu đơn hàng
     */
    protected function beforeSave(): static
    {
        // Nếu là update (có ID), hãy tải model từ DB để bắt được trạng thái CŨ thực tế
        $id = $this->request->input('id') ?? $this->request->get('id');
        
        if ($id && !$this->model) {
            $this->model = $this->repository->findById($id);
        }

        if ($this->model) {
            $this->oldStatus = $this->model->order_status;
        }
        return $this;
    }

    /**
     * Hook xử lý sau khi lưu đơn hàng thành công
     */
    protected function afterSave(): static
    {
        if (!$this->model) return $this;

        $newStatus = $this->model->order_status;
        $oldStatus = $this->oldStatus;

        // Kiểm tra thay đổi trạng thái đơn hàng
        if ($oldStatus !== $newStatus) {
            // 1. Nếu chuyển sang Cancelled: Hoàn tồn kho
            if ($newStatus === 'cancelled') {
                try {
                    $this->inventoryService->restoreOrderInventory($this->model);
                } catch (Exception $e) {
                    Log::error("Failed to restore inventory for order ID: " . $this->model->id . " Error: " . $e->getMessage());
                }
            }
        }

        // 2. Nếu đơn hàng không phải Đã hủy: Luôn kiểm tra để bù trừ kho nếu cần (Auto-Sync)
        // Đưa ra ngoài để sửa lỗi cho các đơn hàng bị "kẹt" số liệu dù không đổi trạng thái
        if ($newStatus !== 'cancelled') {
            try {
                $this->inventoryService->deductOrderInventory($this->model);
            } catch (Exception $e) {
                Log::error("Failed to sync inventory for order ID: " . $this->model->id . " Error: " . $e->getMessage());
            }
        }

        // 3. Nếu chuyển sang Completed và có yêu cầu tạo phiếu thu (Chỉ chạy khi đổi trạng thái)
        if ($oldStatus !== $newStatus && $newStatus === 'completed' && $this->request->boolean('create_receipt')) {
            $isCreated = $this->createOrderReceipt();
            if ($isCreated) {
                $this->model->payment_status = 'paid';
                $this->model->save();
            }
        }

        // Dispatch event OrderUpdated cho Admin Dashboard dọn dẹp cache
        event(new \App\Events\Admin\Order\OrderUpdated($this->model));

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
        return $this->repository->getModel()->with([
            'orderItems' => function($q) {
                $q->with(['product', 'variant']);
            }, 
            'paymentMethod'
        ])->where('order_code', $code)->first();
    }

    /**
     * Override show to include relations for Admin
     */
    public function show($id, $relations = ['orderItems.product', 'orderItems.variant', 'paymentMethod'])
    {
        return $this->repository->findById($id, $relations, ['*']);
    }

    /**
     * Tạo phiếu thu cho đơn hàng từ Sổ quỹ
     */
    protected function createOrderReceipt()
    {
        try {
            $reasonId = $this->request->input('receipt_reason_id');
            if (!$reasonId) {
                // Lấy lý do mặc định cho 'receipt' (Thu tiền bán hàng)
                $defaultReason = CashReason::receipt()->where('is_default', true)->first();
                $reasonId = $defaultReason ? $defaultReason->id : null;
            }

            // Sinh mã giao dịch PT-YYMMDD-XXXX
            $transactionCode = CashTransaction::generateTransactionCode('receipt');

            $transactionData = [
                'transaction_code' => $transactionCode,
                'transaction_type' => 'receipt',
                'payment_method' => $this->model->payment_method_id ? 'bank' : 'cash', // Logic đơn giản dựa trên payment method
                'reason_id' => $reasonId,
                'amount' => $this->model->total_amount,
                'description' => "Thu tiền cho đơn hàng #" . $this->model->order_code,
                'transaction_date' => now()->format('Y-m-d'),
                'reference_code' => $this->model->order_code,
                'partner_group' => 'customer',
                'partner_id' => $this->model->customer_id,
                'partner_name' => $this->model->customer_name,
                'publish' => '2',
                'user_id' => Auth::id() ?? 1,
            ];

            \App\Models\CashTransaction::create($transactionData);
            
            Log::info("Cash receipt created for order #" . $this->model->order_code);
            return true;
        } catch (Exception $e) {
            Log::error("Failed to create receipt for order #" . $this->model->order_code . ": " . $e->getMessage());
            return false;
        }
    }

    /**
     * Phục vụ cho luồng lưu dữ liệu của BaseService
     */
    protected function withRelation(): static
    {
        return $this;
    }
}

