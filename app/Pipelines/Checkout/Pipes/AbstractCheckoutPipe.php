<?php

namespace App\Pipelines\Checkout\Pipes;

use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use App\Services\Interfaces\Checkout\CheckoutServiceInterface;
use Closure;

abstract class AbstractCheckoutPipe
{
    /**
     * Handle the pipe execution
     * 
     * @param CheckoutPayload $payload
     * @param Closure $next
     * @return CheckoutPayload
     */
    abstract public function handle(CheckoutPayload $payload, Closure $next): CheckoutPayload;
}
