<?php

namespace App\Pipelines\Checkout;

use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use Illuminate\Pipeline\Pipeline;
use Illuminate\Support\Facades\DB;
use App\Services\Interfaces\Checkout\CheckoutServiceInterface;

class CheckoutPipelineManager
{
    /**
     * Get the pipes for the checkout pipeline
     * 
     * @return array
     */
    protected function getPipes(): array
    {
        return [
            Pipes\ValidateStockPipe::class,
            Pipes\CreateOrderPipe::class,
            Pipes\ProcessOrderItemsPipe::class,
            Pipes\DeductInventoryPipe::class,
            Pipes\HandlePaymentResultPipe::class,
            Pipes\ClearCartPipe::class,
        ];
    }

    /**
     * Run the checkout pipeline
     * 
     * @param CheckoutPayload $payload
     * @return CheckoutPayload
     */
    public function run(CheckoutPayload $payload): CheckoutPayload
    {
        return DB::transaction(function () use ($payload) {
            return app(Pipeline::class)
                ->send($payload)
                ->through($this->getPipes())
                ->then(fn ($payload) => $payload);
        });
    }
}
