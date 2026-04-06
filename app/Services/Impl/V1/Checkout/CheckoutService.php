<?php

namespace App\Services\Impl\V1\Checkout;

use App\Services\Interfaces\Checkout\CheckoutServiceInterface;
use App\Services\Interfaces\Cart\CartServiceInterface;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

use App\Pipelines\Checkout\CheckoutPipelineManager;
use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use App\Events\Frontend\Checkout\OrderCreated;

class CheckoutService implements CheckoutServiceInterface
{
    protected CartServiceInterface $cartService;
    protected CheckoutPipelineManager $pipelineManager;

    public function __construct(
        CartServiceInterface $cartService,
        CheckoutPipelineManager $pipelineManager
    ) {
        $this->cartService = $cartService;
        $this->pipelineManager = $pipelineManager;
    }

    /**
     * Get checkout data (cart items, customer info, etc.)
     * 
     * @return array
     */
    public function getCheckoutData(): array
    {
        $cart = $this->cartService->get();
        $customer = Auth::guard('customer')->user();
        $paymentMethods = PaymentMethod::where('status', 'active')->orderBy('order')->get();
        
        return [
            'cart' => $cart,
            'customer' => $customer,
            'paymentMethods' => $paymentMethods,
        ];
    }

    /**
     * Get order by code
     * 
     * @param string $code
     * @return Order|null
     */
    public function getOrderByCode(string $code)
    {
        return Order::with(['orderItems.product', 'orderItems.variant', 'paymentMethod'])->where('order_code', $code)->first();
    }

    /**
     * Process the order creation
     * 
     * @param Request $request
     * @return array
     */
    public function processOrder(Request $request): array
    {
        // Force recalculate to ensure session totals are fresh from DB/Rules
        $this->cartService->recalculate();
        
        $cart = $this->cartService->get();
        if (empty($cart['items'])) {
            throw new \Exception('Giỏ hàng trống');
        }

        $customer = Auth::guard('customer')->user();
        
        \Illuminate\Support\Facades\Log::info('[CHECKOUT] Final Total in Session before Pipe: ' . ($cart['final_total'] ?? 'MISSING'));

        // 1. Initialize Pipeline Payload
        $payload = new CheckoutPayload();
        $payload->setData($cart, $customer, $request);

        // 2. Chạy Pipeline
        $result = $this->pipelineManager->run($payload);

        if (!$result->isSuccess) {
            throw new \Exception($result->message);
        }

        // 3. Kích hoạt Sự kiện OrderCreated (Dành cho Invalidate Cache Dashboard, Gửi Mail...)
        if ($result->order) {
            OrderCreated::dispatch($result->order, $result);
        }

        return $result->response;
    }
}
