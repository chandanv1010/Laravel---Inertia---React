<?php

namespace App\Services\Impl\V1\Warehouse;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Warehouse\ImportOrderServiceInterface;
use App\Repositories\Warehouse\ImportOrderRepo;
use App\Repositories\Product\ProductWarehouseStockRepo;
use App\Repositories\Product\ProductWarehouseStockLogRepo;
use App\Repositories\Product\ProductVariantWarehouseStockRepo;
use App\Repositories\Product\ProductVariantWarehouseStockLogRepo;
use App\Repositories\Product\ProductBatchWarehouseRepo;
use App\Repositories\Product\ProductBatchStockLogRepo;
use App\Helpers\DropdownHelper;
use App\Pipelines\ImportOrder\ImportOrderPipelineManager;
use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use App\Models\ImportOrderItem;
use App\Models\ImportOrderHistory;

class ImportOrderService extends BaseCacheService implements ImportOrderServiceInterface {

    protected string $cacheStrategy = 'default';
    protected string $module = 'import_orders';

    protected $repository;
    protected $warehouseStockRepo;
    protected $warehouseStockLogRepo;
    protected $variantWarehouseStockRepo;
    protected $variantWarehouseStockLogRepo;
    protected $batchWarehouseRepo;
    protected $batchStockLogRepo;
    protected ?ImportOrderPipelineManager $pipelineManager = null;

    protected $with = ['creators', 'supplier', 'warehouse', 'responsibleUser', 'items.product.current_languages', 'items.productVariant.attributes', 'history.user'];
    protected $simpleFilter = ['status', 'supplier_id', 'warehouse_id', 'responsible_user_id', 'user_id'];
    protected $searchFields = ['code', 'reference', 'notes'];
    protected $sort = ['id', 'desc'];

    public function __construct(
        ImportOrderRepo $repository,
        ProductWarehouseStockRepo $warehouseStockRepo,
        ProductWarehouseStockLogRepo $warehouseStockLogRepo,
        ProductVariantWarehouseStockRepo $variantWarehouseStockRepo,
        ProductVariantWarehouseStockLogRepo $variantWarehouseStockLogRepo,
        ProductBatchWarehouseRepo $batchWarehouseRepo,
        ProductBatchStockLogRepo $batchStockLogRepo
    )
    {
        $this->repository = $repository;
        $this->warehouseStockRepo = $warehouseStockRepo;
        $this->warehouseStockLogRepo = $warehouseStockLogRepo;
        $this->variantWarehouseStockRepo = $variantWarehouseStockRepo;
        $this->variantWarehouseStockLogRepo = $variantWarehouseStockLogRepo;
        $this->batchWarehouseRepo = $batchWarehouseRepo;
        $this->batchStockLogRepo = $batchStockLogRepo;
        parent::__construct($repository);
    }
    
    /**
     * Get or create pipeline manager instance
     */
    protected function getPipelineManager(): ImportOrderPipelineManager
    {
        if (!isset($this->pipelineManager)) {
            $this->pipelineManager = new ImportOrderPipelineManager(
                $this, // Pass current service instance
                app(\App\Services\Interfaces\Product\ProductServiceInterface::class),
                app(\App\Services\Interfaces\Product\ProductVariantServiceInterface::class)
            );
        }
        return $this->pipelineManager;
    }
    
    /**
     * Expose repositories to Pipeline Pipes (thay vì dùng Reflection)
     * Các methods này cho phép pipes truy cập repos một cách an toàn
     */
    public function getRepository()
    {
        return $this->repository;
    }
    
    public function getWarehouseStockRepo()
    {
        return $this->warehouseStockRepo;
    }
    
    public function getWarehouseStockLogRepo()
    {
        return $this->warehouseStockLogRepo;
    }
    
    public function getVariantWarehouseStockRepo()
    {
        return $this->variantWarehouseStockRepo;
    }
    
    public function getVariantWarehouseStockLogRepo()
    {
        return $this->variantWarehouseStockLogRepo;
    }
    
    public function getBatchWarehouseRepo()
    {
        return $this->batchWarehouseRepo;
    }
    
    public function getBatchStockLogRepo()
    {
        return $this->batchStockLogRepo;
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        
        // Tự động tạo mã đơn nhập nếu không có
        if (empty($this->modelData['code']) && (!$this->model || !$this->model->id)) {
            // Tạo mã mới: AT + số thứ tự 5 chữ số (AT00001, AT00002, ...)
            $lastOrder = $this->repository->getModel()
                ->where('code', 'like', 'AT%')
                ->orderBy('id', 'desc')
                ->first();
            
            $nextNumber = 1;
            if ($lastOrder && $lastOrder->code) {
                // Lấy số từ mã cuối cùng (ví dụ: AT00001 -> 1, AT00002 -> 2)
                $lastNumber = (int) preg_replace('/^AT/i', '', $lastOrder->code);
                $nextNumber = $lastNumber + 1;
            }
            
            // Format số với 5 chữ số: 1 -> 00001, 2 -> 00002, ...
            $this->modelData['code'] = 'AT' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
        } elseif(isset($this->modelData['code'])){
             $this->modelData['code'] = strtoupper($this->modelData['code']);
        }
        
        // Handle import_costs - convert array to JSON
        if ($this->request->has('import_costs') && is_array($this->request->input('import_costs'))) {
            $this->modelData['import_costs'] = json_encode($this->request->input('import_costs'));
        }
        
        // Set status based on import_to_stock
        // Nếu import_to_stock = true -> status = 'completed' (đã nhập kho)
        // Nếu import_to_stock = false -> status = 'pending' (hàng đang về)
        // Chỉ set khi tạo mới, khi update thì giữ nguyên status hiện tại (trừ khi có thay đổi import_to_stock)
        $importToStock = $this->request->boolean('import_to_stock', false);
        if (!$this->model || !$this->model->id) {
            // Tạo mới: set status dựa trên import_to_stock
            $this->modelData['status'] = $importToStock ? 'completed' : 'pending';
        } elseif ($this->request->has('import_to_stock')) {
            // Update và có thay đổi import_to_stock: cập nhật status
            $this->modelData['status'] = $importToStock ? 'completed' : 'pending';
        }
        
        // Remove items from modelData, will handle separately
        unset($this->modelData['items']);
        unset($this->modelData['import_to_stock']);
        
        return $this;
    }

    protected function afterSave(): static {
        // Chỉ chạy Pipeline nếu có items hoặc có payment_status change
        if (!$this->request->has('items') && !$this->request->has('payment_status')) {
            return parent::afterSave();
            }

        if (!$this->model) {
        return parent::afterSave();
    }
    
        // Tạo payload từ context hiện tại
        $payload = new ImportOrderPayload($this->request);
        $payload->setOrder($this->model);
        
        // Detect if this is a new order: check if wasRecentlyCreated or if original status was null (new record)
        // wasRecentlyCreated might be false if model was accessed after save, so we check getOriginal('status') too
        $isNewOrder = $this->model->wasRecentlyCreated || ($this->model->getOriginal('status') === null);
        $payload->isNewOrder = $isNewOrder;
        $payload->wasPending = !$isNewOrder && ($this->model->getOriginal('status') ?? 'pending') === 'pending';
        $payload->isNowCompleted = $this->model->status === 'completed';
        
        // Set importToStock flag từ request (quan trọng!)
        $payload->importToStock = $this->request->boolean('import_to_stock', false);
        
        // Set payment status tracking
        if ($this->request->has('payment_status')) {
            $payload->oldPaymentStatus = $this->model->getOriginal('payment_status') ?? 'unpaid';
            $payload->newPaymentStatus = $this->model->payment_status ?? 'unpaid';
    }
    
        // Log để debug
        Log::info('ImportOrderService::afterSave - Payload data', [
            'order_id' => $this->model->id,
            'order_code' => $this->model->code,
            'warehouse_id' => $payload->warehouseId,
            'importToStock' => $payload->importToStock,
            'isNewOrder' => $payload->isNewOrder,
            'wasPending' => $payload->wasPending,
            'isNowCompleted' => $payload->isNowCompleted,
            'items_count' => count($payload->items),
        ]);
        
        // Chạy Pipeline với action='save'
        $this->getPipelineManager()->process($payload, 'save');
        
        return parent::afterSave();
    }
    
    // Các methods updateWarehouseStocks, updateBatchWarehouseStocks đã được move vào Pipeline
    // Giữ clearProductCache() vì có thể được gọi từ nơi khác

    public function getDropdown()
    {
        $request = new Request([
            'type' => 'all',
            'sort' => 'id,desc'
        ]);
        $records = $this->paginate($request);
        return DropdownHelper::transform($records, [
            'valueKey' => 'id',
            'labelKey' => 'code',
            'isMultipleLanguage' => false,
        ]);
    }

    /**
     * Import order to stock
     * Nhập kho đơn nhập hàng
     */
    public function importToStock(int $id)
    {
        $this->findById($id);
        
        if (!$this->model) {
            throw new \Exception('Đơn nhập hàng không tồn tại!');
        }

        // Check if already imported
        if ($this->model->status === 'completed') {
            throw new \Exception('Đơn nhập hàng đã được nhập kho!');
        }

        // Check if order has items
        if (!$this->model->items || $this->model->items->count() === 0) {
            throw new \Exception('Đơn nhập hàng không có sản phẩm!');
        }

        // Check if warehouse is set
        if (!$this->model->warehouse_id) {
            throw new \Exception('Chưa chọn kho nhập hàng!');
        }

        return DB::transaction(function () use ($id) {
            // Tạo payload từ model hiện tại
            $payload = new ImportOrderPayload(new Request());
            $payload->setOrder($this->model);
            
            // Set warehouseId từ order
            $payload->warehouseId = $this->model->warehouse_id;
            
            // Load items qua relationship (acceptable vì đây là relationship của chính model)
            $items = $this->model->items;
            $payload->items = $items->map(function ($item) {
                $itemData = [
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'discount' => $item->discount,
                    'discount_type' => $item->discount_type,
                    'total_price' => $item->total_price,
                    'notes' => $item->notes,
                ];
                
                // Parse batch_allocations từ JSON nếu cần
                if ($item->batch_allocations) {
                    if (is_string($item->batch_allocations)) {
                        $itemData['batch_allocations'] = json_decode($item->batch_allocations, true) ?? [];
                    } else {
                        $itemData['batch_allocations'] = $item->batch_allocations;
                    }
                } else {
                    $itemData['batch_allocations'] = []; // Set empty array nếu null
                }
                
                return $itemData;
            })->toArray();
            
            $payload->importToStock = true;
            $payload->wasPending = ($this->model->status ?? 'pending') === 'pending';
            $payload->isNowCompleted = true;
            
            // Log để debug
            Log::info('ImportToStock - Payload data', [
                'order_id' => $this->model->id,
                'warehouse_id' => $payload->warehouseId,
                'items_count' => count($payload->items),
                'items' => array_map(function($item) {
                    return [
                        'product_id' => $item['product_id'] ?? null,
                        'variant_id' => $item['product_variant_id'] ?? null,
                        'quantity' => $item['quantity'] ?? 0,
                        'has_batch_allocations' => !empty($item['batch_allocations'] ?? []),
                        'batch_allocations_count' => count($item['batch_allocations'] ?? []),
                    ];
                }, $payload->items),
            ]);

            // Chạy Pipeline với action='import_to_stock'
            // Pipeline sẽ validate, update stocks, create history, clear cache
            $this->getPipelineManager()->process($payload, 'import_to_stock');

            // Update order status
            $this->model->status = 'completed';
            $this->model->save();
            
            // Refresh model to get latest data
            $this->model->refresh();

            return $this->model;
        });
    }

    /**
     * Clear product cache to reflect updated stock
     */
    protected function clearProductCache(): void
    {
        try {
            \Illuminate\Support\Facades\Cache::tags(['products'])->flush();
        } catch (\Exception $e) {
            // If tags not supported, try clearing all cache
            \Illuminate\Support\Facades\Cache::flush();
        }
    }

    /**
     * Cancel import order (set status to cancelled)
     * Hủy đơn nhập hàng - đặt trạng thái thành cancelled
     */
    public function cancel(int $id)
    {
        $this->findById($id);
        
        if (!$this->model) {
            throw new \Exception('Đơn nhập hàng không tồn tại!');
        }

        // Chỉ cho phép hủy đơn chưa nhập kho
        if ($this->model->status === 'completed') {
            throw new \Exception('Không thể hủy đơn nhập hàng đã được nhập kho!');
        }

        // Không cho phép hủy đơn đã bị hủy
        if ($this->model->status === 'cancelled') {
            throw new \Exception('Đơn nhập hàng đã bị hủy!');
        }

        return DB::transaction(function () use ($id) {
            // Update status to cancelled
            $this->model->status = 'cancelled';
            $this->model->save();

            // Tạo payload và chạy Pipeline
            $payload = new ImportOrderPayload(new Request());
            $payload->setOrder($this->model);

            // Chạy Pipeline với action='cancel'
            $this->getPipelineManager()->process($payload, 'cancel');

            return $this->model;
        });
    }

    /**
     * Restore cancelled import order (set status back to pending)
     * Khôi phục đơn nhập hàng đã hủy
     */
    public function restore(int $id)
    {
        $this->findById($id);
        
        if (!$this->model) {
            throw new \Exception('Đơn nhập hàng không tồn tại!');
        }

        // Chỉ cho phép khôi phục đơn đã bị hủy
        if ($this->model->status !== 'cancelled') {
            throw new \Exception('Chỉ có thể khôi phục đơn nhập hàng đã bị hủy!');
        }

        return DB::transaction(function () use ($id) {
            // Update status back to pending
            $this->model->status = 'pending';
            $this->model->save();

            // Tạo payload và chạy Pipeline
            $payload = new ImportOrderPayload(new Request());
            $payload->setOrder($this->model);

            // Chạy Pipeline với action='restore'
            $this->getPipelineManager()->process($payload, 'restore');

            return $this->model;
        });
    }
}
