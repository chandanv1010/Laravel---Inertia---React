<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use Illuminate\Support\Facades\Log;

class UpdateStatusPipe extends AbstractReturnImportOrderPipe
{
    public function handle(ReturnImportOrderPayload $payload, \Closure $next): ReturnImportOrderPayload
    {
        if (!$payload->order || !$payload->order->id) {
            return $next($payload);
        }
        
        // Update status thành 'completed' nếu export_to_stock = true
        if ($payload->exportToStock && $payload->order->status !== 'completed') {
            $payload->order->status = 'completed';
            $payload->order->save();
            
            $payload->wasPending = ($payload->order->getOriginal('status') ?? 'pending') === 'pending';
            $payload->isNowCompleted = true;
            
            Log::info('UpdateStatusPipe - Status updated to completed', [
                'return_order_id' => $payload->order->id,
                'return_code' => $payload->orderCode,
            ]);
        }
        
        return $next($payload);
    }
}

