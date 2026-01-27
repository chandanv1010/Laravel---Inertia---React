<?php

namespace App\Pipelines\ImportOrder\Payloads;

use App\Models\ImportOrder;
use Illuminate\Http\Request;

class ImportOrderPayload
{
    public ?ImportOrder $order = null;
    public array $items = [];
    public array $modelData = [];
    public Request $request;
    
    // Flags
    public bool $isNewOrder = false;
    public bool $importToStock = false;
    public bool $wasPending = false;
    public bool $isNowCompleted = false;
    
    // Payment tracking
    public ?string $oldPaymentStatus = null;
    public ?string $newPaymentStatus = null;
    
    // Context
    public ?int $warehouseId = null;
    public ?string $orderCode = null;
    public ?int $orderId = null;
    
    // Service references (injected)
    public $service = null;
    
    public function __construct(Request $request)
    {
        $this->request = $request;
        $this->items = $request->input('items', []);
        $this->importToStock = $request->boolean('import_to_stock', false);
    }
    
    public function setOrder(ImportOrder $order): self
    {
        $this->order = $order;
        $this->orderId = $order->id;
        $this->orderCode = $order->code;
        $this->warehouseId = $order->warehouse_id;
        return $this;
    }
    
    public function getOrder(): ?ImportOrder
    {
        return $this->order;
    }
    
    public function setService($service): self
    {
        $this->service = $service;
        return $this;
    }
    
    public function getService()
    {
        return $this->service;
    }
}
