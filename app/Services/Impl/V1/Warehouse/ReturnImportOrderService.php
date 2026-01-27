<?php

namespace App\Services\Impl\V1\Warehouse;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Warehouse\ReturnImportOrderServiceInterface;
use App\Repositories\Warehouse\ReturnImportOrderRepo;
use App\Repositories\Warehouse\ImportOrderRepo;
use App\Repositories\Product\ProductWarehouseStockRepo;
use App\Repositories\Product\ProductWarehouseStockLogRepo;
use App\Repositories\Product\ProductVariantWarehouseStockRepo;
use App\Repositories\Product\ProductVariantWarehouseStockLogRepo;
use App\Repositories\Product\ProductBatchWarehouseRepo;
use App\Repositories\Product\ProductBatchStockLogRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;
use App\Models\ReturnImportOrderItem;
use App\Models\ImportOrder;
use App\Pipelines\ReturnImportOrder\ReturnImportOrderPipelineManager;
use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use Illuminate\Support\Facades\Log;

class ReturnImportOrderService extends BaseCacheService implements ReturnImportOrderServiceInterface
{
    protected string $cacheStrategy = 'default';
    protected string $module = 'return_import_orders';

    protected $repository;
    protected $importOrderRepo;
    protected $warehouseStockRepo;
    protected $warehouseStockLogRepo;
    protected $variantWarehouseStockRepo;
    protected $variantWarehouseStockLogRepo;
    protected $batchWarehouseRepo;
    protected $batchStockLogRepo;
    
    protected ?ReturnImportOrderPipelineManager $pipelineManager = null;

    protected $with = ['creators', 'importOrder', 'supplier', 'warehouse', 'responsibleUser', 'items.product.current_languages', 'items.productVariant.attributes'];
    protected $simpleFilter = ['status', 'supplier_id', 'warehouse_id', 'return_type', 'user_id'];
    protected $searchFields = ['code', 'return_reason', 'notes'];
    protected $sort = ['id', 'desc'];

    public function __construct(
        ReturnImportOrderRepo $repository,
        ImportOrderRepo $importOrderRepo,
        ProductWarehouseStockRepo $warehouseStockRepo,
        ProductWarehouseStockLogRepo $warehouseStockLogRepo,
        ProductVariantWarehouseStockRepo $variantWarehouseStockRepo,
        ProductVariantWarehouseStockLogRepo $variantWarehouseStockLogRepo,
        ProductBatchWarehouseRepo $batchWarehouseRepo,
        ProductBatchStockLogRepo $batchStockLogRepo
    ) {
        $this->repository = $repository;
        $this->importOrderRepo = $importOrderRepo;
        $this->warehouseStockRepo = $warehouseStockRepo;
        $this->warehouseStockLogRepo = $warehouseStockLogRepo;
        $this->variantWarehouseStockRepo = $variantWarehouseStockRepo;
        $this->variantWarehouseStockLogRepo = $variantWarehouseStockLogRepo;
        $this->batchWarehouseRepo = $batchWarehouseRepo;
        $this->batchStockLogRepo = $batchStockLogRepo;
        parent::__construct($repository);
    }
    
    /**
     * Get Pipeline Manager (lazy initialization để tránh circular dependency)
     */
    protected function getPipelineManager(): ReturnImportOrderPipelineManager
    {
        if (!isset($this->pipelineManager)) {
            $this->pipelineManager = new ReturnImportOrderPipelineManager(
                $this, // Pass current service instance
                app(\App\Services\Interfaces\Product\ProductServiceInterface::class),
                app(\App\Services\Interfaces\Product\ProductVariantServiceInterface::class)
            );
        }
        return $this->pipelineManager;
    }

    /**
     * Prepare model data from request
     */
    protected function prepareModelData(): static
    {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = \Illuminate\Support\Facades\Auth::id();
        
        // Auto generate code if not provided
        if (empty($this->modelData['code'])) {
            $this->modelData['code'] = $this->generateReturnCode();
        }
        
        return $this;
    }

    /**
     * Tự động tạo mã đơn trả hàng
     */
    protected function generateReturnCode(): string
    {
        $lastOrder = $this->repository->getModel()
            ->where('code', 'like', 'TH%')
            ->orderBy('id', 'desc')
            ->first();

        $nextNumber = 1;
        if ($lastOrder && $lastOrder->code) {
            $lastNumber = (int) preg_replace('/^TH/i', '', $lastOrder->code);
            $nextNumber = $lastNumber + 1;
        }

        return 'TH' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Trả hàng theo đơn nhập
     */
    public function returnByOrder(int $importOrderId, array $data)
    {
        return DB::transaction(function () use ($importOrderId, $data) {
            // Lấy thông tin đơn nhập
            $importOrder = ImportOrder::with('items.product', 'items.productVariant')->find($importOrderId);
            
            if (!$importOrder) {
                throw new \Exception('Đơn nhập hàng không tồn tại!');
            }

            // Tạo payload
            $request = new Request($data);
            $payload = new ReturnImportOrderPayload($request);
            $payload->returnType = 'by_order';
            $payload->importOrder = $importOrder;
            $payload->importOrderId = $importOrderId;
            $payload->items = $data['items'] ?? [];
            $payload->exportToStock = true; // Force true for by_order
            $payload->isNewOrder = true;
            
            // Set warehouseId từ data hoặc importOrder
            $payload->warehouseId = $data['warehouse_id'] ?? $importOrder->warehouse_id;
            
            Log::info('ReturnImportOrderService::returnByOrder - Starting pipeline', [
                'import_order_id' => $importOrderId,
                'items_count' => count($payload->items),
                'warehouse_id' => $payload->warehouseId,
            ]);
            
            // Chạy Pipeline với action='return_by_order'
            // Pipeline sẽ: validate, prepare data, save order, save items, subtract stocks, update status, create history, clear cache
            $this->getPipelineManager()->process($payload, 'return_by_order');
            
            // Order đã được tạo bởi BaseService hoặc SaveReturnOrderPipe
            // Cần load lại để có items và relations
            if ($payload->order && $payload->order->id) {
                $returnOrder = $payload->order->load($this->with);
            } else {
                // Fallback: load order mới nhất nếu payload không có
                $returnOrder = $this->repository->getModel()
                    ->where('import_order_id', $importOrderId)
                    ->orderBy('id', 'desc')
                    ->first();
                if ($returnOrder) {
                    $returnOrder->load($this->with);
                }
            }
            
            if (!$returnOrder) {
                throw new \Exception('Không thể tạo đơn trả hàng!');
            }
            
            return $returnOrder;
        });
    }

    /**
     * Trả hàng không theo đơn
     */
    public function returnWithoutOrder(array $data)
    {
        return DB::transaction(function () use ($data) {
            // Validate warehouse
            // if (empty($data['warehouse_id'])) {
            //     throw new \Exception('Vui lòng chọn kho hàng!');
            // }

            // Tạo payload
            $request = new Request($data);
            $payload = new ReturnImportOrderPayload($request);
            $payload->returnType = 'without_order';
            $payload->items = $data['items'] ?? [];
            $payload->exportToStock = $data['export_to_stock'] ?? true;
            $payload->isNewOrder = true;
            $payload->warehouseId = $data['warehouse_id'] ?? null; // Allow null
            
            Log::info('ReturnImportOrderService::returnWithoutOrder - Starting pipeline', [
                'warehouse_id' => $payload->warehouseId,
                'items_count' => count($payload->items),
                'export_to_stock' => $payload->exportToStock,
            ]);
            
            // Chạy Pipeline với action='return_without_order'
            // Pipeline sẽ: validate, prepare data, save order, save items, subtract stocks, update status, create history, clear cache
            $this->getPipelineManager()->process($payload, 'return_without_order');
            
            // Order đã được tạo bởi BaseService hoặc SaveReturnOrderPipe
            // Cần load lại để có items và relations
            if ($payload->order && $payload->order->id) {
                $returnOrder = $payload->order->load($this->with);
            } else {
                // Fallback: load order mới nhất
                $returnOrder = $this->repository->getModel()
                    ->where('warehouse_id', $payload->warehouseId)
                    ->where('return_type', 'without_order')
                    ->orderBy('id', 'desc')
                    ->first();
                if ($returnOrder) {
                    $returnOrder->load($this->with);
                }
            }
            
            if (!$returnOrder) {
                throw new \Exception('Không thể tạo đơn trả hàng!');
            }
            
            return $returnOrder;
        });
    }

    /**
     * Xuất kho khi trả hàng (cho đơn pending)
     */
    public function exportToStock(int $id)
    {
        $this->findById($id);

        if (!$this->model) {
            throw new \Exception('Đơn trả hàng không tồn tại!');
        }

        if ($this->model->status === 'completed') {
            throw new \Exception('Đơn trả hàng đã xuất kho!');
        }

        return DB::transaction(function () {
            // Tạo payload từ model hiện tại
            $payload = new ReturnImportOrderPayload(new Request());
            $payload->setOrder($this->model);
            $payload->returnType = 'export_to_stock';
            $payload->exportToStock = true;
            
            // Load items qua relationship
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
            
            $payload->warehouseId = $this->model->warehouse_id;
            $payload->wasPending = ($this->model->status ?? 'pending') === 'pending';
            $payload->isNowCompleted = true;
            
            Log::info('ReturnImportOrderService::exportToStock - Starting pipeline', [
                'return_order_id' => $this->model->id,
                'warehouse_id' => $payload->warehouseId,
                'items_count' => count($payload->items),
            ]);
            
            // Chạy Pipeline với action='export_to_stock'
            // Pipeline sẽ: validate, subtract stocks, update status, create history, clear cache
            $this->getPipelineManager()->process($payload, 'export_to_stock');
            
            // Refresh model to get latest data
            $this->model->refresh();
            
            return $this->model->load($this->with);
        });
    }

    /**
     * Xác nhận đã nhận hoàn tiền từ NCC
     */
    public function confirmRefund(int $id)
    {
        $this->findById($id);

        if (!$this->model) {
            throw new \Exception('Đơn trả hàng không tồn tại!');
        }

        if ($this->model->status !== 'completed') {
            throw new \Exception('Đơn trả hàng chưa hoàn thành xuất kho!');
        }

        // refund_status chỉ có 2 giá trị: 'received' hoặc 'later' (theo migration)
        if ($this->model->refund_status === 'received') {
            throw new \Exception('Đơn trả hàng đã được xác nhận hoàn tiền!');
        }

        return DB::transaction(function () {
            // Cập nhật trạng thái hoàn tiền
            $this->model->refund_status = 'received';
            $this->model->save();

            // Clear cache của return_import_order (để show() method load lại data mới)
            $this->invalidateCache();
            
            // Clear product cache
            $this->clearProductCache();

            // Load lại với relationships để trả về data đầy đủ
            $this->model->refresh();
            return $this->model->load($this->with);
        });
    }

    /**
     * Lưu các sản phẩm trả hàng
     */
    protected function saveReturnItems(int $returnOrderId, array $items): void
    {
        foreach ($items as $index => $item) {
            if (empty($item['product_id']) || empty($item['quantity'])) {
                continue;
            }

            ReturnImportOrderItem::create([
                'return_import_order_id' => $returnOrderId,
                'product_id' => $item['product_id'],
                'product_variant_id' => $item['product_variant_id'] ?? null,
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'] ?? 0,
                'discount' => $item['discount'] ?? 0,
                // Nếu không có discount hoặc discount = 0, set discount_type = 'fixed'
                'discount_type' => ($item['discount'] ?? 0) > 0 ? ($item['discount_type'] ?? 'amount') : 'fixed',
                'batch_allocations' => $item['batch_allocations'] ?? null,
                'total_price' => $item['total_price'] ?? 0,
                'notes' => $item['notes'] ?? null,
                'order' => $index,
            ]);
        }
    }

    /**
     * Trừ tồn kho khi trả hàng
     */
    protected function subtractWarehouseStocks(array $items, int $warehouseId, string $returnCode): void
    {
        foreach ($items as $item) {
            $quantity = (int) ($item['quantity'] ?? 0);
            if ($quantity <= 0) continue;

            $productId = $item['product_id'] ?? null;
            $variantId = $item['product_variant_id'] ?? null;

            // Xử lý batch allocations nếu có
            $batchAllocations = $item['batch_allocations'] ?? null;
            if (is_string($batchAllocations)) {
                $batchAllocations = json_decode($batchAllocations, true) ?? [];
            }

            if ($batchAllocations && is_array($batchAllocations) && count($batchAllocations) > 0) {
                // Trừ theo lô
                foreach ($batchAllocations as $allocation) {
                    $batchId = $allocation['batch_id'] ?? null;
                    $batchQty = (int) ($allocation['quantity'] ?? 0);
                    $batchCode = $allocation['batch_code'] ?? 'Unknown';

                    if ($batchId && $batchQty > 0) {
                        $this->subtractBatchWarehouseStock($batchId, $warehouseId, $batchQty, $productId, $variantId, $batchCode, $returnCode);
                    }
                }
            }

            // Trừ tồn kho tổng (product/variant)
            if ($variantId) {
                $this->subtractVariantWarehouseStock($variantId, $warehouseId, $quantity, $returnCode);
            } elseif ($productId) {
                $this->subtractProductWarehouseStock($productId, $warehouseId, $quantity, $returnCode);
            }
        }
    }

    /**
     * Trừ tồn kho sản phẩm
     */
    protected function subtractProductWarehouseStock(int $productId, int $warehouseId, int $quantity, string $returnCode): void
    {
        $existingStock = $this->warehouseStockRepo->getModel()
            ->lockForUpdate()
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        $beforeStock = $existingStock ? (int) $existingStock->stock_quantity : 0;
        
        // Strict validation: Không cho phép tồn kho âm
        if ($beforeStock < $quantity) {
             throw new \Exception("Tồn kho không đủ để trả hàng! Sản phẩm ID {$productId}, Tồn hiện tại: {$beforeStock}, Yêu cầu trả: {$quantity}");
        }

        $afterStock = $beforeStock - $quantity;

        $this->warehouseStockRepo->updateOrCreateStock(
            ['product_id' => $productId, 'warehouse_id' => $warehouseId],
            ['stock_quantity' => $afterStock]
        );

        $this->warehouseStockLogRepo->create([
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => -$quantity,
            'after_stock' => $afterStock,
            'reason' => "Trả hàng NCC từ đơn #{$returnCode}",
            'transaction_type' => 'return',
            'user_id' => Auth::id(),
        ]);
    }

    /**
     * Trừ tồn kho variant
     */
    protected function subtractVariantWarehouseStock(int $variantId, int $warehouseId, int $quantity, string $returnCode): void
    {
        $existingStock = $this->variantWarehouseStockRepo->getModel()
            ->lockForUpdate()
            ->where('product_variant_id', $variantId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        $beforeStock = $existingStock ? (int) $existingStock->stock_quantity : 0;
        
        // Strict validation: Không cho phép tồn kho âm
        if ($beforeStock < $quantity) {
            throw new \Exception("Tồn kho biến thể không đủ để trả hàng! Variant ID {$variantId}, Tồn hiện tại: {$beforeStock}, Yêu cầu trả: {$quantity}");
        }

        $afterStock = $beforeStock - $quantity;

        $this->variantWarehouseStockRepo->updateOrCreateStock(
            ['product_variant_id' => $variantId, 'warehouse_id' => $warehouseId],
            ['stock_quantity' => $afterStock]
        );

        $this->variantWarehouseStockLogRepo->create([
            'product_variant_id' => $variantId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => -$quantity,
            'after_stock' => $afterStock,
            'reason' => "Trả hàng NCC từ đơn #{$returnCode}",
            'transaction_type' => 'return',
            'user_id' => Auth::id(),
        ]);
    }

    /**
     * Trừ tồn kho theo lô
     */
    protected function subtractBatchWarehouseStock(
        int $batchId,
        int $warehouseId,
        int $quantity,
        ?int $productId,
        ?int $variantId,
        string $batchCode,
        string $returnCode
    ): void {
        $existingStock = $this->batchWarehouseRepo->getModel()
            ->lockForUpdate()
            ->where('product_batch_id', $batchId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        $beforeStock = $existingStock ? (int) $existingStock->stock_quantity : 0;
        
        // Strict validation
        if ($beforeStock < $quantity) {
             throw new \Exception("Tồn kho lô không đủ để trả hàng! Lô {$batchCode}, Tồn hiện tại: {$beforeStock}, Yêu cầu trả: {$quantity}");
        }

        $afterStock = $beforeStock - $quantity;

        $this->batchWarehouseRepo->updateOrCreateStock(
            ['product_batch_id' => $batchId, 'warehouse_id' => $warehouseId],
            ['stock_quantity' => $afterStock]
        );

        $this->batchStockLogRepo->create([
            'product_batch_id' => $batchId,
            'product_id' => $productId,
            'product_variant_id' => $variantId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => -$quantity,
            'after_stock' => $afterStock,
            'reason' => "Trả hàng NCC từ đơn #{$returnCode} - Lô: {$batchCode}",
            'transaction_type' => 'return',
            'user_id' => Auth::id(),
        ]);
    }

    /**
     * Clear product cache để tính lại tồn kho
     */
    protected function clearProductCache(): void
    {
        Cache::tags(['products'])->flush();
    }

    /**
     * Lấy danh sách đơn nhập đã hoàn thành
     */
    public function getCompletedImportOrders(array $filters = [])
    {
        $query = ImportOrder::with(['supplier', 'warehouse', 'items.product.current_languages'])
            ->where('status', 'completed')
            ->orderBy('id', 'desc');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['warehouse_id'])) {
            $query->where('warehouse_id', $filters['warehouse_id']);
        }

        return $query->paginate($filters['perPage'] ?? 10);
    }

    /**
     * Lấy chi tiết đơn nhập để trả hàng
     */
    public function getImportOrderDetails(int $importOrderId)
    {
        $order = ImportOrder::with([
            'supplier',
            'warehouse',
            'items.product.current_languages',
            'items.product.warehouseStocks',
            'items.product.batches.warehouseStocks',
            'items.productVariant.attributes',
            'items.productVariant.warehouseStocks',
        ])->find($importOrderId);

        if ($order) {
            // Lấy danh sách items đã trả
            $previousReturnItems = ReturnImportOrderItem::whereHas('returnImportOrder', function ($query) use ($importOrderId) {
                $query->where('import_order_id', $importOrderId)
                      ->where('status', 'completed');
            })->get();

            foreach ($order->items as $item) {
                // Tính toán số lượng đã trả
                $returnedQty = $previousReturnItems->where('product_id', $item->product_id)
                    ->where('product_variant_id', $item->product_variant_id)
                    ->sum('quantity');
                
                $item->returned_quantity = $returnedQty;
                
                // Số lượng còn lại có thể trả
                $item->remaining_quantity = max(0, $item->quantity - $returnedQty);
            }
        }

        return $order;
    }
    
    /**
     * Expose repositories to Pipeline Pipes (thay vì dùng Reflection)
     * Các methods này cho phép pipes truy cập repos một cách an toàn và type-safe
     */
    public function getRepository()
    {
        return $this->repository;
    }
    
    public function getImportOrderRepo()
    {
        return $this->importOrderRepo;
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
}
