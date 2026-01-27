<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use Illuminate\Support\Facades\Log;

class SaveReturnOrderPipe extends AbstractReturnImportOrderPipe
{
    public function handle(ReturnImportOrderPayload $payload, \Closure $next): ReturnImportOrderPayload
    {
        // Skip nếu đang export_to_stock (đơn đã tồn tại)
        if ($payload->returnType === 'export_to_stock') {
            return $next($payload);
        }
        
        // Skip nếu đã có order (update case)
        if ($payload->order && $payload->order->id) {
            return $next($payload);
        }
        
        // Tạo order từ modelData
        if (empty($payload->modelData)) {
            Log::warning('SaveReturnOrderPipe - No modelData to create order');
            return $next($payload);
        }
        
        $repository = $this->getRepository();
        $returnOrder = $repository->create($payload->modelData);
        
        // Set order vào payload
        $payload->setOrder($returnOrder);
        $payload->orderId = $returnOrder->id;
        $payload->orderCode = $returnOrder->code;
        $payload->warehouseId = $returnOrder->warehouse_id;
        $payload->isNewOrder = true;
        
        Log::info('SaveReturnOrderPipe - Order created', [
            'return_order_id' => $returnOrder->id,
            'return_code' => $returnOrder->code,
            'return_type' => $returnOrder->return_type,
        ]);
        
        return $next($payload);
    }
}

