<?php

namespace App\Pipelines\ReturnImportOrder\Payloads;

use App\Models\ReturnImportOrder;
use App\Models\ImportOrder;
use Illuminate\Http\Request;

class ReturnImportOrderPayload
{
    public ?ReturnImportOrder $order = null;
    public array $items = [];
    public array $modelData = [];
    public Request $request;
    
    // Return type
    public string $returnType = 'by_order'; // 'by_order' | 'without_order' | 'export_to_stock'
    
    // Flags
    public bool $isNewOrder = false;
    public bool $exportToStock = false;
    public bool $wasPending = false;
    public bool $isNowCompleted = false;
    
    // Context for return_by_order
    public ?ImportOrder $importOrder = null;
    public ?int $importOrderId = null;
    
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
        $this->exportToStock = $request->boolean('export_to_stock', false);
    }
    
    public function setOrder(ReturnImportOrder $order): self
    {
        $this->order = $order;
        $this->orderId = $order->id;
        $this->orderCode = $order->code;
        $this->warehouseId = $order->warehouse_id;
        $this->returnType = $order->return_type ?? 'by_order';
        $this->exportToStock = $order->export_to_stock ?? false;
        return $this;
    }
    
    public function getOrder(): ?ReturnImportOrder
    {
        return $this->order;
    }
    
    public function setImportOrder(ImportOrder $importOrder): self
    {
        $this->importOrder = $importOrder;
        $this->importOrderId = $importOrder->id;
        return $this;
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

