<?php

namespace App\Pipelines\Checkout\Pipes;

use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use App\Models\PaymentMethod;
use Closure;

class HandlePaymentResultPipe extends AbstractCheckoutPipe
{
    /**
     * Xử lý kết quả đặt hàng và xác định hướng điều hướng sau khi đơn hàng thành công.
     * 
     * Bước này thực hiện:
     * 1. Lấy thông tin đơn hàng và phương thức thanh toán đã lưu từ payload.
     * 2. Phân nhánh logic dựa trên mã phương thức thanh toán (cod, transfer, online...):
     *    - COD: Chuyển hướng đến trang thành công (`success`).
     *    - Transfer (Chuyển khoản): Chuyển hướng đến trang hướng dẫn thanh toán (`payment`).
     *    - Các cổng thanh toán online khác: Có thể chuyển hướng đến Gateway tương ứng.
     * 3. Chuẩn bị dữ liệu phản hồi (Response) gửi về cho Frontend thông qua Inertia.
     * 
     * @param CheckoutPayload $payload
     * @param Closure $next
     * @return CheckoutPayload
     */
    public function handle(CheckoutPayload $payload, Closure $next): CheckoutPayload
    {
        \Illuminate\Support\Facades\Log::info('[CHECKOUT PIPELINE] 5. Bắt đầu HandlePaymentResultPipe');
        $order = $payload->order;
        $paymentMethod = $order->paymentMethod;

        $payload->response = [
            'status' => 'success',
            'order_code' => $order->order_code,
            'message' => 'Đặt hàng thành công!'
        ];

        if ($paymentMethod->code === 'cod') {
            $payload->redirectTo = 'success';
        } elseif ($paymentMethod->code === 'transfer') {
            $payload->redirectTo = 'payment';
        } else {
            $payload->redirectTo = 'gateway';
        }

        $payload->response['redirect_to'] = $payload->redirectTo;

        return $next($payload);
    }
}
