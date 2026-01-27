<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CreateHistoryPipe extends AbstractReturnImportOrderPipe
{
    public function handle(ReturnImportOrderPayload $payload, \Closure $next): ReturnImportOrderPayload
    {
        if (!$payload->order || !$payload->order->id) {
            return $next($payload);
        }
        
        // Determine action context from payload flags and order status
        $orderStatus = $payload->order->status ?? null;
        $originalStatus = $payload->order->getOriginal('status') ?? null;
        
        // Export to stock: pending -> completed
        if ($payload->wasPending && $payload->isNowCompleted) {
            $this->createHistoryEntry(
                $payload->order->id,
                'Xác nhận xuất kho đơn trả hàng',
                "Đã xuất kho đơn trả hàng {$payload->orderCode}"
            );
        }
        // New order
        elseif ($payload->isNewOrder) {
            $action = $payload->returnType === 'by_order' 
                ? 'Thêm mới đơn trả hàng theo đơn nhập'
                : 'Thêm mới đơn trả hàng không theo đơn';
            
            $description = $payload->returnType === 'by_order'
                ? "Đã tạo đơn trả hàng {$payload->orderCode} từ đơn nhập #{$payload->importOrder?->code}"
                : "Đã tạo đơn trả hàng {$payload->orderCode}";
            
            $this->createHistoryEntry($payload->order->id, $action, $description);
        }
        // Regular update (not export to stock)
        elseif (!$payload->isNowCompleted && !$payload->isNewOrder) {
            $this->createHistoryEntry(
                $payload->order->id,
                'Cập nhật đơn trả hàng',
                "Đã cập nhật thông tin đơn trả hàng {$payload->orderCode}"
            );
        }
        
        return $next($payload);
    }
    
    protected function createHistoryEntry(int $returnOrderId, string $action, string $description): void
    {
        // Note: Hiện tại chưa có ReturnImportOrderHistory model
        // Có thể tạo sau hoặc log vào hệ thống log chung
        // Tạm thời log vào Laravel log
        Log::info('ReturnImportOrder History', [
            'return_order_id' => $returnOrderId,
            'action' => $action,
            'description' => $description,
            'user_id' => Auth::id(),
        ]);
        
        // TODO: Tạo ReturnImportOrderHistory model và table nếu cần
        // ReturnImportOrderHistory::create([
        //     'return_import_order_id' => $returnOrderId,
        //     'user_id' => Auth::id(),
        //     'action' => $action,
        //     'description' => $description,
        // ]);
    }
}

