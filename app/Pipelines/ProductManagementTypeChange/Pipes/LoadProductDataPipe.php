<?php

namespace App\Pipelines\ProductManagementTypeChange\Pipes;

use App\Pipelines\ProductManagementTypeChange\Payloads\ProductManagementTypeChangePayload;

class LoadProductDataPipe extends AbstractProductManagementTypeChangePipe
{
    public function handle(ProductManagementTypeChangePayload $payload, \Closure $next): ProductManagementTypeChangePayload
    {
        // Load product với relations cần thiết
        $product = $this->productService->show($payload->productId);
        
        if (!$product) {
            throw new \Exception("Product not found: {$payload->productId}");
        }
        
        $payload->setProduct($product);
        
        // Load variants nếu product có variants
        // Đảm bảo variants được load đầy đủ với relations cần thiết
        if (!$product->relationLoaded('variants')) {
            $product->load('variants');
        }
        
        if ($product->variants && $product->variants->count() > 0) {
            $variants = [];
            foreach ($product->variants as $variant) {
                // Load thêm warehouseStocks và batches nếu chưa có
                if (!$variant->relationLoaded('warehouseStocks')) {
                    $variant->load('warehouseStocks');
                }
                if (!$variant->relationLoaded('batches')) {
                    $variant->load('batches.warehouseStocks');
                }
                $variants[] = $variant;
            }
            $payload->setVariants($variants);
            $payload->isVariantLevelChange = true;
        }
        
        return $next($payload);
    }
}
