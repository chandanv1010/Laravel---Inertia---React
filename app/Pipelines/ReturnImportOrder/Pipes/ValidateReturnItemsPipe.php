<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use App\Models\ReturnImportOrderItem;
use Illuminate\Support\Facades\Log;

class ValidateReturnItemsPipe extends AbstractReturnImportOrderPipe
{
    protected ProductServiceInterface $productService;
    protected ProductVariantServiceInterface $variantService;
    
    public function __construct($service, ProductServiceInterface $productService, ProductVariantServiceInterface $variantService)
    {
        parent::__construct($service);
        $this->productService = $productService;
        $this->variantService = $variantService;
    }
    
    public function handle(ReturnImportOrderPayload $payload, \Closure $next): ReturnImportOrderPayload
    {
        // Validate theo returnType
        if ($payload->returnType === 'by_order') {
            $this->validateForByOrder($payload);
        } elseif ($payload->returnType === 'without_order') {
            $this->validateForWithoutOrder($payload);
        } elseif ($payload->returnType === 'export_to_stock') {
            $this->validateForExportToStock($payload);
        }
        
        // Validate batch allocations cho tất cả các loại
        $this->validateBatchAllocations($payload);
        
        return $next($payload);
    }
    
    /**
     * Validate cho return_by_order: validate với đơn nhập gốc
     */
    protected function validateForByOrder(ReturnImportOrderPayload $payload): void
    {
        if (!$payload->importOrder) {
            throw new \Exception('Đơn nhập hàng không tồn tại!');
        }
        
        if ($payload->importOrder->status !== 'completed') {
            throw new \Exception('Chỉ có thể trả hàng từ đơn nhập đã hoàn thành!');
        }
        
        $importItems = $payload->importOrder->items;
        
        // Lấy danh sách đã trả trước đó để validate số lượng còn lại
        $previousReturnItems = ReturnImportOrderItem::whereHas('returnImportOrder', function ($query) use ($payload) {
            $query->where('import_order_id', $payload->importOrderId)
                  ->where('status', 'completed');
        })->get();
        
        foreach ($payload->items as $item) {
            $productId = $item['product_id'] ?? null;
            $variantId = $item['product_variant_id'] ?? null;
            $requestQty = (int) ($item['quantity'] ?? 0);
            
            if (!$productId || $requestQty <= 0) {
                continue;
            }
            
            // 1. Validate với số lượng nhập gốc
            $importItem = $importItems->where('product_id', $productId)
                ->where('product_variant_id', $variantId)
                ->first();
            
            if (!$importItem) {
                throw new \Exception("Sản phẩm (ID: {$productId}) không có trong đơn nhập gốc!");
            }
            
            // 2. Validate với số lượng còn lại có thể trả
            $returnedQty = $previousReturnItems->where('product_id', $productId)
                ->where('product_variant_id', $variantId)
                ->sum('quantity');
            
            $remainingQty = max(0, $importItem->quantity - $returnedQty);
            
            if ($requestQty > $remainingQty) {
                $productName = $importItem->product->name ?? "ID: {$productId}";
                throw new \Exception("Sản phẩm {$productName}: Số lượng trả ({$requestQty}) vượt quá số lượng còn lại có thể trả ({$remainingQty})!");
            }
        }
        
        Log::info('ValidateReturnItemsPipe - by_order validation passed', [
            'import_order_id' => $payload->importOrderId,
            'items_count' => count($payload->items),
        ]);
    }
    
    /**
     * Validate cho return_without_order: validate warehouse và tồn kho cơ bản
     */
    protected function validateForWithoutOrder(ReturnImportOrderPayload $payload): void
    {
        // FIFO: Warehouse is optional
        // if (empty($payload->warehouseId) && empty($payload->request->input('warehouse_id'))) {
        //     throw new \Exception('Vui lòng chọn kho hàng!');
        // }
        
        // Tồn kho sẽ được validate trong SubtractWarehouseStocksPipe
        // Ở đây chỉ validate cơ bản
        
        Log::info('ValidateReturnItemsPipe - without_order validation passed', [
            'warehouse_id' => $payload->warehouseId,
            'items_count' => count($payload->items),
        ]);
    }
    
    /**
     * Validate cho export_to_stock: validate đơn và tồn kho
     */
    protected function validateForExportToStock(ReturnImportOrderPayload $payload): void
    {
        if (!$payload->order) {
            throw new \Exception('Đơn trả hàng không tồn tại!');
        }
        
        if ($payload->order->status === 'completed') {
            throw new \Exception('Đơn trả hàng đã xuất kho!');
        }
        
        // Tồn kho sẽ được validate trong SubtractWarehouseStocksPipe
        
        Log::info('ValidateReturnItemsPipe - export_to_stock validation passed', [
            'return_order_id' => $payload->orderId,
            'items_count' => count($payload->items),
        ]);
    }
    
    /**
     * Validate batch allocations cho tất cả các loại
     */
    protected function validateBatchAllocations(ReturnImportOrderPayload $payload): void
    {
        // Nếu là trả hàng không theo đơn (FIFO), bỏ qua validate batch allocations đầu vào
        // Batch sẽ được tự động phân bổ trong SubtractBatchStocksPipe
        if ($payload->returnType === 'without_order') {
            return;
        }

        foreach ($payload->items as $index => $item) {
            $productId = $item['product_id'] ?? null;
            $variantId = $item['product_variant_id'] ?? null;
            
            if (!$productId && !$variantId) {
                continue;
            }
            
            // Lấy product để check management_type
            $product = null;
            if ($variantId) {
                $variant = $this->variantService->show($variantId);
                if ($variant && $variant->product_id) {
                    $product = $this->productService->show($variant->product_id);
                }
            } elseif ($productId) {
                $product = $this->productService->show($productId);
            }
            
            if ($product && $product->management_type === 'batch') {
                $batchAllocations = $item['batch_allocations'] ?? [];
                $totalBatchQty = 0;
                
                // Parse JSON nếu cần
                if (is_string($batchAllocations)) {
                    $batchAllocations = json_decode($batchAllocations, true) ?? [];
                }
                
                if (is_array($batchAllocations)) {
                    foreach ($batchAllocations as $alloc) {
                        $totalBatchQty += (int) ($alloc['quantity'] ?? 0);
                    }
                }
                
                $itemQty = (int) ($item['quantity'] ?? 0);
                
                if (empty($batchAllocations) || count($batchAllocations) === 0) {
                    throw new \Exception("Sản phẩm quản lý theo lô nhưng chưa chọn lô trả hàng!");
                }
                
                if ($totalBatchQty !== $itemQty) {
                    throw new \Exception("Sản phẩm có số lượng lô ({$totalBatchQty}) không khớp với số lượng trả ({$itemQty})!");
                }
            }
        }
    }
}

