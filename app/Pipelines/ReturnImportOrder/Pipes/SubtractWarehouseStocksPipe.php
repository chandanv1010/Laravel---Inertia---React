<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SubtractWarehouseStocksPipe extends AbstractReturnImportOrderPipe
{
    protected ProductServiceInterface $productService;
    protected ProductVariantServiceInterface $variantService;
    
    public function __construct($service, ProductServiceInterface $productService, ProductVariantServiceInterface $variantService)
    {
        parent::__construct($service);
        $this->productService = $productService;
        $this->variantService = $variantService;
    }
    
    protected function getProductService(): ProductServiceInterface
    {
        return $this->productService;
    }
    
    protected function getVariantService(): ProductVariantServiceInterface
    {
        return $this->variantService;
    }
    
    public function handle(ReturnImportOrderPayload $payload, \Closure $next): ReturnImportOrderPayload
    {
        // Chỉ trừ tồn kho nếu export_to_stock = true
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
        
        foreach ($payload->items as $item) {
            $quantity = (int) ($item['quantity'] ?? 0);
            if ($quantity <= 0) continue;
            
            $productId = $item['product_id'] ?? null;
            $variantId = $item['product_variant_id'] ?? null;
            
            // Lấy product để check management_type HIỆN TẠI
            $product = null;
            if ($variantId) {
                $variant = $this->getVariantService()->show($variantId);
                if ($variant && $variant->product_id) {
                    $product = $this->getProductService()->show($variant->product_id);
                }
            } elseif ($productId) {
                $product = $this->getProductService()->show($productId);
            }
            
            // Kiểm tra management_type HIỆN TẠI của sản phẩm
            $isCurrentlyBatch = $product && $product->management_type === 'batch';
            
            // Skip batch items - let SubtractBatchStocksPipe handle them
            if ($isCurrentlyBatch) {
                continue; 
            }
            
            // Check for explicit batch allocations (legacy check, just in case management_type missing)
            $batchAllocations = $item['batch_allocations'] ?? null;
            if (is_string($batchAllocations)) {
                $batchAllocations = json_decode($batchAllocations, true) ?? [];
            }
            if (!empty($batchAllocations) && is_array($batchAllocations) && count($batchAllocations) > 0) {
                continue;
            }
            
            // Subtract Logic
            if ($payload->warehouseId) {
                // Direct Warehouse Subtraction
                if ($variantId) {
                    $this->subtractVariantWarehouseStock($variantId, $payload->warehouseId, $quantity, $payload->orderCode);
                } elseif ($productId) {
                    $this->subtractProductWarehouseStock($productId, $payload->warehouseId, $quantity, $payload->orderCode);
                }
            } else {
                // FIFO / Automatic Subtraction (No Warehouse Selected)
                if ($variantId) {
                    $this->subtractVariantStockFIFO($variantId, $quantity, $payload->orderCode);
                } elseif ($productId) {
                    $this->subtractProductStockFIFO($productId, $quantity, $payload->orderCode);
                }
            }
        }
        
        return $next($payload);
    }

    protected function subtractProductStockFIFO(int $productId, int $quantity, string $returnCode): void
    {
        $warehouseStockRepo = $this->getWarehouseStockRepo();
        
        // Find warehouses with stock
        $stocks = $warehouseStockRepo->getModel()
            ->lockForUpdate()
            ->where('product_id', $productId)
            ->where('stock_quantity', '>', 0)
            ->orderBy('warehouse_id', 'asc') // Deterministic order
            ->get();
            
        $remainingQty = $quantity;
        
        foreach ($stocks as $stock) {
            if ($remainingQty <= 0) break;
            
            $take = min($remainingQty, (int)$stock->stock_quantity);
            
            // Deduct
            $this->subtractProductWarehouseStock($productId, $stock->warehouse_id, $take, $returnCode);
            
            $remainingQty -= $take;
        }
        
        if ($remainingQty > 0) {
            throw new \Exception("Tổng tồn kho không đủ để trả hàng! Sản phẩm ID {$productId}, Thiếu: {$remainingQty}");
        }
    }

    protected function subtractVariantStockFIFO(int $variantId, int $quantity, string $returnCode): void
    {
        $variantWarehouseStockRepo = $this->getVariantWarehouseStockRepo();
        
        // Find warehouses with stock
        $stocks = $variantWarehouseStockRepo->getModel()
            ->lockForUpdate()
            ->where('product_variant_id', $variantId)
            ->where('stock_quantity', '>', 0)
            ->orderBy('warehouse_id', 'asc') // Deterministic order
            ->get();
            
        $remainingQty = $quantity;
        
        foreach ($stocks as $stock) {
            if ($remainingQty <= 0) break;
            
            $take = min($remainingQty, (int)$stock->stock_quantity);
            
            // Deduct
            $this->subtractVariantWarehouseStock($variantId, $stock->warehouse_id, $take, $returnCode);
            
            $remainingQty -= $take;
        }
        
        if ($remainingQty > 0) {
            throw new \Exception("Tổng tồn kho biến thể không đủ để trả hàng! Variant ID {$variantId}, Thiếu: {$remainingQty}");
        }
    }
    
    protected function subtractProductWarehouseStock(int $productId, int $warehouseId, int $quantity, string $returnCode): void
    {
        $warehouseStockRepo = $this->getWarehouseStockRepo();
        $warehouseStockLogRepo = $this->getWarehouseStockLogRepo();
        
        // Lock and get existing stock to prevent race conditions
        $existingStock = $warehouseStockRepo->getModel()
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
        
        // Update or create warehouse stock (already locked, safe to update)
        $warehouseStockRepo->updateOrCreateStock(
            [
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
            ],
            [
                'stock_quantity' => $afterStock,
            ]
        );
        
        // Create log
        $warehouseStockLogRepo->create([
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => -$quantity,
            'after_stock' => $afterStock,
            'reason' => "Trả hàng NCC từ đơn #{$returnCode}",
            'transaction_type' => 'return',
            'user_id' => Auth::id(),
        ]);
        
        Log::info('SubtractWarehouseStocksPipe - Product stock subtracted', [
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'quantity' => $quantity,
            'after_stock' => $afterStock,
        ]);
    }
    
    protected function subtractVariantWarehouseStock(int $variantId, int $warehouseId, int $quantity, string $returnCode): void
    {
        $variantWarehouseStockRepo = $this->getVariantWarehouseStockRepo();
        $variantWarehouseStockLogRepo = $this->getVariantWarehouseStockLogRepo();
        
        // Lock and get existing stock to prevent race conditions
        $existingStock = $variantWarehouseStockRepo->getModel()
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
        
        // Update or create warehouse stock (already locked, safe to update)
        $variantWarehouseStockRepo->updateOrCreateStock(
            [
                'product_variant_id' => $variantId,
                'warehouse_id' => $warehouseId,
            ],
            [
                'stock_quantity' => $afterStock,
            ]
        );
        
        // Create log
        $variantWarehouseStockLogRepo->create([
            'product_variant_id' => $variantId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => -$quantity,
            'after_stock' => $afterStock,
            'reason' => "Trả hàng NCC từ đơn #{$returnCode}",
            'transaction_type' => 'return',
            'user_id' => Auth::id(),
        ]);
        
        Log::info('SubtractWarehouseStocksPipe - Variant stock subtracted', [
            'variant_id' => $variantId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'quantity' => $quantity,
            'after_stock' => $afterStock,
        ]);
    }
}

