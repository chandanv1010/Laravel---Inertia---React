<?php

namespace App\Services\Interfaces\Checkout;

use Illuminate\Http\Request;
use App\Pipelines\Checkout\Payloads\CheckoutPayload;

interface CheckoutServiceInterface
{
    /**
     * Get checkout data (cart items, customer info, etc.)
     * 
     * @return array
     */
    public function getCheckoutData(): array;

    /**
     * Get order by code
     * 
     * @param string $code
     * @return \App\Models\Order|null
     */
    public function getOrderByCode(string $code);

    /**
     * Process the order creation
     * 
     * @param Request $request
     * @return array
     */
    public function processOrder(Request $request): array;
}
