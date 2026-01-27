<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ClearCachePipe extends AbstractReturnImportOrderPipe
{
    public function handle(ReturnImportOrderPayload $payload, \Closure $next): ReturnImportOrderPayload
    {
        // Invalidate return import order cache
        $service = $this->getService();
        if (method_exists($service, 'invalidateCache')) {
            $service->invalidateCache();
        }
        
        // Clear product cache when stock is updated
        if ($payload->exportToStock) {
            $this->clearProductCache();
        }
        
        Log::info('ClearCachePipe - Cache cleared', [
            'return_order_id' => $payload->orderId,
            'export_to_stock' => $payload->exportToStock,
        ]);
        
        return $next($payload);
    }
    
    protected function clearProductCache(): void
    {
        try {
            Cache::tags(['products'])->flush();
        } catch (\Exception $e) {
            // If tags not supported, try clearing all cache
            Cache::flush();
        }
    }
}

