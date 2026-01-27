<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use Illuminate\Support\Facades\Cache;

class ClearCachePipe extends AbstractImportOrderPipe
{
    public function handle(ImportOrderPayload $payload, \Closure $next): ImportOrderPayload
    {
        // Invalidate import order cache
        $service = $this->getService();
        if (method_exists($service, 'invalidateCache')) {
            $service->invalidateCache();
        }
        
        // Clear product cache when stock is updated
        if ($payload->importToStock) {
            $this->clearProductCache();
        }
        
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
