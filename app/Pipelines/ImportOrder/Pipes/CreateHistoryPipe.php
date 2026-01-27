<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use App\Models\ImportOrderHistory;
use Illuminate\Support\Facades\Auth;

class CreateHistoryPipe extends AbstractImportOrderPipe
{
    public function handle(ImportOrderPayload $payload, \Closure $next): ImportOrderPayload
    {
        if (!$payload->order || !$payload->order->id) {
            return $next($payload);
        }
        
        // Determine action context from payload flags and order status
        $orderStatus = $payload->order->status ?? null;
        $originalStatus = $payload->order->getOriginal('status') ?? null;
        
        // Cancel action: status changed to cancelled
        if ($orderStatus === 'cancelled' && $originalStatus !== 'cancelled') {
            ImportOrderHistory::create([
                'import_order_id' => $payload->order->id,
                'user_id' => Auth::id(),
                'action' => 'Hủy đơn nhập hàng',
                'description' => "Đã hủy đơn nhập hàng {$payload->orderCode}",
            ]);
        }
        // Restore action: status changed from cancelled to pending
        elseif ($orderStatus === 'pending' && $originalStatus === 'cancelled') {
            ImportOrderHistory::create([
                'import_order_id' => $payload->order->id,
                'user_id' => Auth::id(),
                'action' => 'Khôi phục đơn nhập hàng',
                'description' => "Đã khôi phục đơn nhập hàng {$payload->orderCode}",
            ]);
        }
        // New order
        elseif ($payload->isNewOrder) {
            ImportOrderHistory::create([
                'import_order_id' => $payload->order->id,
                'user_id' => Auth::id(),
                'action' => 'Thêm mới đơn nhập hàng',
                'description' => "Đã tạo đơn nhập hàng {$payload->orderCode}",
            ]);
        }
        // Import to stock: pending -> completed
        elseif ($payload->wasPending && $payload->isNowCompleted) {
            ImportOrderHistory::create([
                'import_order_id' => $payload->order->id,
                'user_id' => Auth::id(),
                'action' => 'Xác nhận nhập kho đơn nhập',
                'description' => "Đã nhập kho đơn nhập hàng {$payload->orderCode}",
            ]);
        }
        // Regular update (not import to stock)
        elseif (!$payload->isNowCompleted && !$payload->isNewOrder) {
            ImportOrderHistory::create([
                'import_order_id' => $payload->order->id,
                'user_id' => Auth::id(),
                'action' => 'Cập nhật đơn nhập hàng',
                'description' => "Đã cập nhật thông tin đơn nhập hàng {$payload->orderCode}",
            ]);
        }
        
        return $next($payload);
    }
}
