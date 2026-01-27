<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;

class ValidateItemsPipe extends AbstractImportOrderPipe
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
        // Chỉ validate nếu import_to_stock = true hoặc đang import to stock
        if (!$payload->importToStock && !$payload->isNowCompleted) {
            return $next($payload);
        }
        
        foreach ($payload->items as $index => $item) {
            $productId = $item['product_id'] ?? null;
            $variantId = $item['product_variant_id'] ?? null;
            
            if (!$productId && !$variantId) {
                continue;
            }
            
            // Lấy product để check management_type HIỆN TẠI
            $product = null;
            if ($variantId) {
                // Lấy variant trước, sau đó lấy product từ variant
                $variant = $this->variantService->show($variantId);
                if ($variant && $variant->product_id) {
                    $product = $this->productService->show($variant->product_id);
                }
            } elseif ($productId) {
                $product = $this->productService->show($productId);
            }
            
            // Chỉ validate batch_allocations nếu sản phẩm HIỆN TẠI là batch
            // Nếu sản phẩm đã chuyển từ batch -> basic sau khi tạo đơn, sẽ không validate batch_allocations
            if ($product && $product->management_type === 'batch') {
                $batchAllocations = $item['batch_allocations'] ?? [];
                $totalBatchQty = 0;
                
                if (is_array($batchAllocations)) {
                    foreach ($batchAllocations as $alloc) {
                        $totalBatchQty += (int) ($alloc['quantity'] ?? 0);
                    }
                }
                
                $itemQty = (int) ($item['quantity'] ?? 0);
                
                // Nếu có batch_allocations, validate số lượng
                if (!empty($batchAllocations) && count($batchAllocations) > 0) {
                    if ($totalBatchQty !== $itemQty) {
                        throw new \Exception("Sản phẩm có số lượng lô ({$totalBatchQty}) không khớp với số lượng nhập ({$itemQty})!");
                    }
                }
                // Nếu không có batch_allocations, sẽ được xử lý tự động trong UpdateWarehouseStocksPipe
                // bằng cách tạo batch DEFAULT và phân bổ vào đó
            }
        }
        
        return $next($payload);
    }
}
