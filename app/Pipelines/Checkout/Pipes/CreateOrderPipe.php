<?php

namespace App\Pipelines\Checkout\Pipes;

use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use App\Repositories\Order\OrderRepo;
use App\Models\PaymentMethod;
use Illuminate\Support\Str;
use Closure;

class CreateOrderPipe extends AbstractCheckoutPipe
{
    protected $orderRepo;

    public function __construct(OrderRepo $orderRepo)
    {
        $this->orderRepo = $orderRepo;
    }
    /**
     * Khởi tạo bản ghi đơn hàng chính trong cơ sở dữ liệu.
     * 
     * Bước này thực hiện:
     * 1. Lấy thông tin giỏ hàng, khách hàng và dữ liệu từ request trong payload.
     * 2. Tạo mã đơn hàng duy nhất (Unique Order Code).
     * 3. Trích xuất tóm tắt thanh toán (tổng giá, giảm giá, voucher...) từ giỏ hàng.
     * 4. Lưu một bản ghi mới vào bảng `orders` với trạng thái mặc định là "Chờ xử lý" (pending) 
     *    và "Chưa thanh toán" (unpaid).
     * 5. Lưu kết quả đơn hàng vừa tạo vào payload để các bước sau có thể sử dụng.
     * 
     * @param CheckoutPayload $payload
     * @param Closure $next
     * @return CheckoutPayload
     */
    public function handle(CheckoutPayload $payload, Closure $next): CheckoutPayload
    {
        \Illuminate\Support\Facades\Log::info('[CHECKOUT PIPELINE] 2. Bắt đầu CreateOrderPipe');
        $cart = $payload->cart;
        $customer = $payload->customer;
        $request = $payload->request;
        $paymentMethod = PaymentMethod::findOrFail($request->input('payment_method_id'));

        $summary = $cart['summary'] ?? [];

        // 1. Tạo đơn hàng với mã tạm thời qua Repository
        $totalAmount = $summary['final_total'] ?? ($cart['final_total'] ?? $cart['total_price']);
        
        \Illuminate\Support\Facades\Log::info("[CREATE ORDER PIPE] totalAmount: {$totalAmount}, retail: " . ($summary['total_retail'] ?? 'N/A'));

        $order = $this->orderRepo->create([
            'order_code' => 'TEMP-' . microtime(true),
            'customer_id' => $customer->id,
            'total_amount' => $totalAmount,
            'subtotal' => $summary['total_retail'] ?? $cart['total_price'],
            'discount_total' => $summary['discount_total'] ?? 0,
            'voucher_discount' => $summary['voucher_discount'] ?? 0,
            'shipping_fee' => 0, 
            'payment_method_id' => $paymentMethod->id,
            'payment_status' => 'unpaid',
            'order_status' => 'pending',
            'shipping_address' => $request->input('address'),
            'customer_name' => $request->input('full_name', $customer->name),
            'customer_phone' => $request->input('phone', $customer->phone),
            'notes' => $request->input('notes'),
            'summary_snapshot' => $summary,
        ]);

        // 2. Tạo mã chính thức dựa trên ID dã có
        $finalCode = $this->generateOrderCode($order->id);

        // 3. Cập nhật lại mã chính thức qua Repository
        $this->orderRepo->update($order->id, ['order_code' => $finalCode]);

        $payload->order = $order->fresh();
        $payload->orderCode = $finalCode;

        return $next($payload);
    }

    /**
     * Tạo mã đơn hàng kết hợp Ngày và ID tự tăng
     * Ví dụ: HTV-240331-000123
     */
    protected function generateOrderCode(int $id): string
    {
        return 'HTV-' . date('ymd') . '-' . str_pad($id, 6, '0', STR_PAD_LEFT);
    }
}
