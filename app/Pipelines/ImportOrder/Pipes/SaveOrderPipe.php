<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;

class SaveOrderPipe extends AbstractImportOrderPipe
{
    public function handle(ImportOrderPayload $payload, \Closure $next): ImportOrderPayload
    {
        // Nếu order đã tồn tại (update), skip pipe này vì đã save ở BaseService::saveModel()
        if ($payload->order && $payload->order->id) {
            // Refresh order để có data mới nhất
            $payload->order->refresh();
            return $next($payload);
        }
        
        // Nếu chưa có order (create), tạo mới
        // Nhưng thực tế order đã được tạo ở BaseService::saveModel() rồi
        // Nên pipe này chỉ cần đảm bảo order được set trong payload
        // Order sẽ được set từ afterSave() trong Service
        
        return $next($payload);
    }
}
