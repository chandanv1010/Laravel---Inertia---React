<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SubtractBatchStocksPipe extends AbstractReturnImportOrderPipe
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
        // Chỉ trừ batch stocks nếu export_to_stock = true
        if (!$payload->exportToStock) {
            return $next($payload);
        }
        
        // Chỉ trừ khi:
        // - Tạo mới và export_to_stock = true
        // - Hoặc export_to_stock action
        $shouldSubtract = false;
        if ($payload->returnType === 'export_to_stock') {
            $shouldSubtract = true;
        } elseif ($payload->isNewOrder && $payload->exportToStock) {
            $shouldSubtract = true;
        }
        
        if (!$shouldSubtract) {
            return $next($payload);
        }
        
        // Track which products/variants need sync after batch subtraction
        $productsToSync = [];
        $variantsToSync = [];
        
        foreach ($payload->items as $index => $item) {
            $productId = $item['product_id'] ?? null;
            $variantId = $item['product_variant_id'] ?? null;
            $quantity = (int) ($item['quantity'] ?? 0);
            
            if ($quantity <= 0) continue;
            
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
            if (!$product || $product->management_type !== 'batch') {
                Log::debug("SubtractBatchStocksPipe - Item {$index} product is not batch-managed, skipping", [
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'current_management_type' => $product ? $product->management_type : 'unknown',
                ]);
                continue;
            }

            if ($payload->warehouseId) {
                // --- EXISTING LOGIC: Warehouse Specific ---
                $batchAllocations = $item['batch_allocations'] ?? null;
                if (is_string($batchAllocations)) {
                    $batchAllocations = json_decode($batchAllocations, true) ?? [];
                }
                
                if (!$batchAllocations || !is_array($batchAllocations) || count($batchAllocations) === 0) {
                    continue;
                }

                // Track để sync sau
                if ($variantId) {
                    $variantsToSync[$variantId] = true;
                } elseif ($productId) {
                    $productsToSync[$productId] = true;
                }
                
                foreach ($batchAllocations as $allocation) {
                    $batchId = $allocation['batch_id'] ?? null;
                    $batchCode = $allocation['batch_code'] ?? 'Unknown';
                    $allocQuantity = (int) ($allocation['quantity'] ?? 0);
                    
                    if (!$batchId || $allocQuantity <= 0) {
                        continue;
                    }
                    
                    $this->subtractBatchWarehouseStock(
                        $batchId, 
                        $payload->warehouseId, 
                        $allocQuantity, 
                        $productId, 
                        $variantId, 
                        $batchCode,
                        $payload->orderCode
                    );
                }
            } else {
                // --- NEW LOGIC: FIFO / Global (No Warehouse Selected) ---
                
                // Get FIFO Stocks
                $stocks = $this->getBatchStocksFIFO($productId);
                
                $remainingQty = $quantity;
                $allocations = [];
                
                foreach ($stocks as $stock) {
                    if ($remainingQty <= 0) break;
                    
                    $take = min($remainingQty, (int)$stock->stock_quantity);
                    
                    $this->subtractBatchWarehouseStock(
                        $stock->product_batch_id,
                        $stock->warehouse_id,
                        $take,
                        $productId,
                        $variantId,
                        $stock->batch_code,
                        $payload->orderCode
                    );
                    
                    $allocations[] = [
                        'batch_id' => $stock->product_batch_id,
                        'batch_code' => $stock->batch_code,
                        'quantity' => $take,
                        'warehouse_id' => $stock->warehouse_id
                    ];
                    
                    $remainingQty -= $take;
                }
                
                if ($remainingQty > 0) {
                    throw new \Exception("Tổng tồn kho lô không đủ để trả hàng! Sản phẩm ID {$productId}, Thiếu: {$remainingQty}");
                }
                
                // Update ReturnImportOrderItem with calculated allocations
                if ($payload->orderId) {
                    \App\Models\ReturnImportOrderItem::where('return_import_order_id', $payload->orderId)
                        ->where('order', $index)
                        ->update(['batch_allocations' => json_encode($allocations)]);
                }

                // Track to sync
                if ($variantId) $variantsToSync[$variantId] = true;
                else $productsToSync[$productId] = true;
            }
        }
        
        // Sync variant/product stock từ batch stocks sau khi trừ batch
        // Điều này đảm bảo variant/product stock được tính chính xác từ batch stocks
        foreach ($variantsToSync as $variantId => $_) {
            try {
                $this->variantService->syncWarehouseStockFromBatches($variantId);
                Log::info('SubtractBatchStocksPipe - Variant stock synced from batches', [
                    'variant_id' => $variantId,
                ]);
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
                Log::info('SubtractBatchStocksPipe - Product stock synced from batches', [
                    'product_id' => $productId,
                ]);
            } catch (\Exception $e) {
                Log::error("Failed to sync product stock from batches", [
                    'product_id' => $productId,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        return $next($payload);
    }

    protected function getBatchStocksFIFO(int $productId): \Illuminate\Support\Collection
    {
        // Join product_batch_warehouse_stocks with product_batches to get creation date and code
        // Order by created_at ASC (Oldest first)
        return $this->getBatchWarehouseRepo()->getModel()
            ->join('product_batches', 'product_batch_warehouse_stocks.product_batch_id', '=', 'product_batches.id')
            ->where('product_batches.product_id', $productId)
            ->where('product_batch_warehouse_stocks.stock_quantity', '>', 0)
            ->orderBy('product_batches.created_at', 'asc')
            ->select(
                'product_batch_warehouse_stocks.*', 
                'product_batches.code as batch_code',
                'product_batches.created_at as batch_created_at'
            )
            ->lockForUpdate() // Lock rows
            ->get();
    }
    
    protected function subtractBatchWarehouseStock(
        int $batchId, 
        int $warehouseId, 
        int $quantity, 
        ?int $productId, 
        ?int $variantId,
        string $batchCode,
        string $returnCode
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
        
        // Strict validation
        if ($beforeStock < $quantity) {
            throw new \Exception("Tồn kho lô không đủ để trả hàng! Lô {$batchCode}, Tồn hiện tại: {$beforeStock}, Yêu cầu trả: {$quantity}");
        }
        
        $afterStock = $beforeStock - $quantity;
        
        Log::info("SubtractBatchStocksPipe - Batch stock subtraction", [
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
            Log::error("SubtractBatchStocksPipe - Stock mismatch after subtraction!", [
                'batch_id' => $batchId,
                'warehouse_id' => $warehouseId,
                'expected' => $afterStock,
                'actual' => $actualStock,
            ]);
            throw new \Exception("Lỗi trừ tồn kho lô: Kỳ vọng {$afterStock} nhưng thực tế là {$actualStock}");
        }
        
        // Create batch stock log
        try {
            $logEntry = $batchStockLogRepo->create([
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
            
            Log::info("SubtractBatchStocksPipe - Batch stock log created", [
                'log_id' => $logEntry->id ?? null,
                'batch_id' => $batchId,
                'transaction_type' => 'return',
            ]);
        } catch (\Exception $e) {
            Log::error("SubtractBatchStocksPipe - Failed to create batch stock log", [
                'batch_id' => $batchId,
                'error' => $e->getMessage(),
            ]);
            // Don't throw - stock was already updated successfully
        }
        
        Log::info("SubtractBatchStocksPipe - Batch stock subtracted successfully", [
            'batch_id' => $batchId,
            'batch_code' => $batchCode,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => -$quantity,
            'after_stock' => $afterStock,
            'verified_stock' => $actualStock,
        ]);
    }
}

