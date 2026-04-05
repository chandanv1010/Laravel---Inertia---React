<?php

namespace App\Events\Frontend\Checkout;

use App\Models\Order;
use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderCreated
{
    use Dispatchable, SerializesModels;

    public $order;
    public $payload;

    /**
     * Create a new event instance.
     *
     * @param Order $order
     * @param CheckoutPayload $payload
     */
    public function __construct(Order $order, CheckoutPayload $payload)
    {
        $this->order = $order;
        $this->payload = $payload;
    }
}
