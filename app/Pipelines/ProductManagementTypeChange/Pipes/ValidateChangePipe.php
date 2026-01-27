<?php

namespace App\Pipelines\ProductManagementTypeChange\Pipes;

use App\Pipelines\ProductManagementTypeChange\Payloads\ProductManagementTypeChangePayload;
use Illuminate\Support\Facades\Log;

class ValidateChangePipe extends AbstractProductManagementTypeChangePipe
{
    public function handle(ProductManagementTypeChangePayload $payload, \Closure $next): ProductManagementTypeChangePayload
    {
        // Validate management types
        $validTypes = ['basic', 'imei', 'batch'];
        
        if (!in_array($payload->oldManagementType, $validTypes)) {
            throw new \Exception("Invalid old management type: {$payload->oldManagementType}");
        }
        
        if (!in_array($payload->newManagementType, $validTypes)) {
            throw new \Exception("Invalid new management type: {$payload->newManagementType}");
        }
        
        // Validate that there's actually a change
        if ($payload->oldManagementType === $payload->newManagementType) {
            Log::info('No management type change detected, skipping conversion', [
                'product_id' => $payload->productId,
                'management_type' => $payload->oldManagementType
            ]);
            // Return payload without processing
            return $payload;
        }
        
        // Determine conversion type
        $payload->isProductLevelChange = true;
        
        Log::info('Validating management type change', [
            'product_id' => $payload->productId,
            'old_type' => $payload->oldManagementType,
            'new_type' => $payload->newManagementType,
            'is_basic_to_batch' => $payload->isBasicToBatch(),
            'is_batch_to_basic' => $payload->isBatchToBasic(),
        ]);
        
        return $next($payload);
    }
}
