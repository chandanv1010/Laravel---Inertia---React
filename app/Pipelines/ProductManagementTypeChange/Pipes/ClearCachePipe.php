<?php

namespace App\Pipelines\ProductManagementTypeChange\Pipes;

use App\Pipelines\ProductManagementTypeChange\Payloads\ProductManagementTypeChangePayload;
use Illuminate\Support\Facades\Log;

class ClearCachePipe extends AbstractProductManagementTypeChangePipe
{
    public function handle(ProductManagementTypeChangePayload $payload, \Closure $next): ProductManagementTypeChangePayload
    {
        Log::info('Clearing cache after management type change', [
            'product_id' => $payload->productId,
            'has_variants' => $payload->hasVariants
        ]);
        
        // Clear cache cho product
        $this->productService->clearCache($payload->productId);
        
        // Clear cache cho từng variant nếu có
        if ($payload->hasVariants) {
            foreach ($payload->variants as $variant) {
                $variantId = is_array($variant) ? $variant['id'] : $variant->id;
                $this->variantService->clearCache($variantId);
            }
        }
        
        return $next($payload);
    }
}
