<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UpdateBatchStocksPipe extends AbstractImportOrderPipe
{
    protected ProductServiceInterface $productService;
    protected ProductVariantServiceInterface $variantService;
    
    public function __construct($service, ProductServiceInterface $productService, ProductVariantServiceInterface $variantService)
    {
        parent::__construct($service);
        $this->productService = $productService;
        $this->variantService = $variantService;
    }
    
    public function handle(ImportOrderPayload $payload, \Closure $next): ImportOrderPayload
    {
        // Chỉ update batch stocks nếu import_to_stock = true và có warehouse
        if (!$payload->importToStock || !$payload->warehouseId) {
            Log::info('UpdateBatchStocksPipe skipped', [
                'importToStock' => $payload->importToStock,
                'warehouseId' => $payload->warehouseId,
            ]);
            return $next($payload);
        }
        
        $shouldUpdate = false;
        if ($payload->isNewOrder) {
            $shouldUpdate = true;
        } elseif ($payload->wasPending && $payload->isNowCompleted) {
            $shouldUpdate = true;
        } elseif ($payload->importToStock && $payload->isNowCompleted && !$payload->wasPending) {
            // Trường hợp tạo mới với import_to_stock = true: isNewOrder có thể false nhưng vẫn cần update
            // Điều kiện: importToStock = true, isNowCompleted = true, và !wasPending (không phải chuyển từ pending)
            $shouldUpdate = true;
        }
        
        if (!$shouldUpdate) {
            Log::info('UpdateBatchStocksPipe - shouldUpdate = false', [
                'isNewOrder' => $payload->isNewOrder,
                'wasPending' => $payload->wasPending,
                'isNowCompleted' => $payload->isNowCompleted,
                'importToStock' => $payload->importToStock,
            ]);
            return $next($payload);
        }
        
        Log::info('UpdateBatchStocksPipe - Starting batch stock update', [
            'warehouse_id' => $payload->warehouseId,
            'items_count' => count($payload->items),
        ]);
        
        // Track which products/variants need sync after batch update
        $productsToSync = [];
        $variantsToSync = [];
        
        foreach ($payload->items as $itemIndex => $item) {
            $productId = $item['product_id'] ?? null;
            $variantId = $item['product_variant_id'] ?? null;
            
            // Lấy product để check management_type HIỆN TẠI
            $product = null;
            if ($variantId) {
                $variant = $this->variantService->show($variantId);
                if ($variant && $variant->product_id) {
                    $product = $this->productService->show($variant->product_id);
                }
            } elseif ($productId) {
                $product = $this->productService->show($productId);
            }
            
            // Chỉ xử lý batch nếu sản phẩm HIỆN TẠI là batch
            // Nếu sản phẩm đã chuyển từ batch -> basic sau khi tạo đơn, bỏ qua batch_allocations
            if (!$product || $product->management_type !== 'batch') {
                Log::debug("UpdateBatchStocksPipe - Item {$itemIndex} product is not batch-managed, skipping", [
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'current_management_type' => $product ? $product->management_type : 'unknown',
                ]);
                continue;
            }
            
            // Chỉ xử lý khi có batch_allocations
            $batchAllocations = $item['batch_allocations'] ?? null;
            
            // Parse JSON string nếu cần
            if (is_string($batchAllocations)) {
                $batchAllocations = json_decode($batchAllocations, true) ?? [];
            }
            
            // Nếu batch_allocations là null, set thành empty array
            if ($batchAllocations === null) {
                $batchAllocations = [];
            }
            
            if (!is_array($batchAllocations) || count($batchAllocations) === 0) {
                Log::debug("UpdateBatchStocksPipe - Item {$itemIndex} has no batch_allocations (already handled by UpdateWarehouseStocksPipe)", [
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                ]);
                continue; // Đã được xử lý tự động trong UpdateWarehouseStocksPipe
            }
            
            Log::info("UpdateBatchStocksPipe - Processing item with batches", [
                'item_index' => $itemIndex,
                'product_id' => $productId,
                'variant_id' => $variantId,
                'batch_allocations_count' => count($batchAllocations),
            ]);
            
            // Track để sync sau
            if ($variantId) {
                $variantsToSync[$variantId] = true;
            } elseif ($productId) {
                $productsToSync[$productId] = true;
            }
            
            foreach ($batchAllocations as $allocIndex => $allocation) {
                $batchId = $allocation['batch_id'] ?? null;
                $batchCode = $allocation['batch_code'] ?? 'Unknown';
                $quantity = (int) ($allocation['quantity'] ?? 0);
                
                if (!$batchId || $quantity <= 0) {
                    Log::warning("UpdateBatchStocksPipe - Invalid allocation", [
                        'allocation_index' => $allocIndex,
                        'batch_id' => $batchId,
                        'quantity' => $quantity,
                    ]);
                    continue;
                }
                
                Log::info("UpdateBatchStocksPipe - Updating batch stock", [
                    'batch_id' => $batchId,
                    'batch_code' => $batchCode,
                    'warehouse_id' => $payload->warehouseId,
                    'quantity' => $quantity,
                ]);
                
                $this->updateBatchWarehouseStock(
                    $batchId, 
                    $payload->warehouseId, 
                    $quantity, 
                    $productId, 
                    $variantId, 
                    $batchCode,
                    $payload->orderCode
                );
            }
        }
        
        // Sync variant/product stock từ batch stocks sau khi update batch
        // Điều này đảm bảo variant/product stock được tính chính xác từ batch stocks
        foreach ($variantsToSync as $variantId => $_) {
            try {
                $this->variantService->syncWarehouseStockFromBatches($variantId);
            } catch (\Exception $e) {
                Log::error("Failed to sync variant stock from batches", [
                    'variant_id' => $variantId,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        foreach ($productsToSync as $productId => $_) {
            try {
                $this->productService->syncWarehouseStockFromBatches($productId);
            } catch (\Exception $e) {
                Log::error("Failed to sync product stock from batches", [
                    'product_id' => $productId,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        return $next($payload);
    }
    
    protected function updateBatchWarehouseStock(
        int $batchId, 
        int $warehouseId, 
        int $quantity, 
        ?int $productId, 
        ?int $variantId,
        string $batchCode,
        string $orderCode
    ): void {
        $batchWarehouseRepo = $this->getBatchWarehouseRepo();
        $batchStockLogRepo = $this->getBatchStockLogRepo();
        
        // Lock and get existing batch stock to prevent race conditions
        $existingStock = $batchWarehouseRepo->getModel()
            ->lockForUpdate()
            ->where('product_batch_id', $batchId)
            ->where('warehouse_id', $warehouseId)
            ->first();
        
        $beforeStock = $existingStock ? (int) $existingStock->stock_quantity : 0;
        $afterStock = $beforeStock + $quantity;
        
        Log::info("UpdateBatchStocksPipe - Batch stock update", [
            'batch_id' => $batchId,
            'batch_code' => $batchCode,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'quantity' => $quantity,
            'after_stock' => $afterStock,
        ]);
        
        // Update or create batch warehouse stock (already locked, safe to update)
        $updatedStock = $batchWarehouseRepo->updateOrCreateStock(
            [
                'product_batch_id' => $batchId,
                'warehouse_id' => $warehouseId,
            ],
            [
                'stock_quantity' => $afterStock,
            ]
        );
        
        // Verify update was successful
        $verifiedStock = $batchWarehouseRepo->getModel()
            ->where('product_batch_id', $batchId)
            ->where('warehouse_id', $warehouseId)
            ->first();
        
        $actualStock = $verifiedStock ? (int) $verifiedStock->stock_quantity : 0;
        
        if ($actualStock !== $afterStock) {
            Log::error("UpdateBatchStocksPipe - Stock mismatch after update!", [
                'batch_id' => $batchId,
                'warehouse_id' => $warehouseId,
                'expected' => $afterStock,
                'actual' => $actualStock,
            ]);
            throw new \Exception("Lỗi cập nhật tồn kho lô: Kỳ vọng {$afterStock} nhưng thực tế là {$actualStock}");
        }
        
        // Create batch stock log
        $batchStockLogRepo->create([
            'product_batch_id' => $batchId,
            'product_id' => $productId,
            'product_variant_id' => $variantId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => $quantity,
            'after_stock' => $afterStock,
            'reason' => "Nhập hàng lô {$batchCode} từ đơn nhập #{$orderCode}",
            'transaction_type' => 'import',
            'user_id' => Auth::id(),
        ]);
        
        Log::info("UpdateBatchStocksPipe - Batch stock updated successfully", [
            'batch_id' => $batchId,
            'batch_code' => $batchCode,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => $quantity,
            'after_stock' => $afterStock,
            'verified_stock' => $actualStock,
        ]);
    }
}
