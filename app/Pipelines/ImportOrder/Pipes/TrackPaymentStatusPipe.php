<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use App\Models\ImportOrderHistory;
use Illuminate\Support\Facades\Auth;

class TrackPaymentStatusPipe extends AbstractImportOrderPipe
{
    public function handle(ImportOrderPayload $payload, \Closure $next): ImportOrderPayload
    {
        if (!$payload->order || !$payload->order->id) {
            return $next($payload);
        }
        
        // Track payment status changes separately
        if ($payload->oldPaymentStatus !== null && $payload->newPaymentStatus !== null) {
            if ($payload->oldPaymentStatus !== $payload->newPaymentStatus) {
                if ($payload->newPaymentStatus === 'paid') {
                    ImportOrderHistory::create([
                        'import_order_id' => $payload->order->id,
                        'user_id' => Auth::id(),
                        'action' => 'Xác nhận thanh toán',
                        'description' => "Đã xác nhận thanh toán đơn nhập hàng {$payload->orderCode}",
                    ]);
                } elseif ($payload->oldPaymentStatus === 'paid' && $payload->newPaymentStatus === 'unpaid') {
                    ImportOrderHistory::create([
                        'import_order_id' => $payload->order->id,
                        'user_id' => Auth::id(),
                        'action' => 'Hủy xác nhận thanh toán',
                        'description' => "Đã hủy xác nhận thanh toán đơn nhập hàng {$payload->orderCode}",
                    ]);
                }
            }
        }
        
        return $next($payload);
    }
}
