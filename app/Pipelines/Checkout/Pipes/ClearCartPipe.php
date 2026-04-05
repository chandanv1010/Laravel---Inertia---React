<?php

namespace App\Pipelines\Checkout\Pipes;

use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use App\Services\Interfaces\Cart\CartServiceInterface;
use Closure;

class ClearCartPipe extends AbstractCheckoutPipe
{
    protected CartServiceInterface $cartService;

    public function __construct(CartServiceInterface $cartService)
    {
        $this->cartService = $cartService;
    }

    /**
     * Làm sạch giỏ hàng sau khi đơn hàng đã được xử lý thành công qua toàn bộ Pipeline.
     * 
     * Bước này thực hiện:
     * 1. Kiểm tra trạng thái thành công của toàn bộ quy trình trước đó thông qua `isSuccess`.
     * 2. Gọi `CartService` để xóa toàn bộ các sản phẩm trong giỏ hàng hiện tại của người dùng.
     * 3. Kết thúc Pipeline và trả về kết quả cuối cùng.
     * 
     * @param CheckoutPayload $payload
     * @param Closure $next
     * @return CheckoutPayload
     */
    public function handle(CheckoutPayload $payload, Closure $next): CheckoutPayload
    {
        if ($payload->isSuccess) {
            $this->cartService->clear();
        }

        return $next($payload);
    }
}
