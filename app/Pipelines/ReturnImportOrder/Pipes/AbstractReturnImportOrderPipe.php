<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use App\Services\Interfaces\Warehouse\ReturnImportOrderServiceInterface;

abstract class AbstractReturnImportOrderPipe
{
    protected ReturnImportOrderServiceInterface $service;
    
    public function __construct(ReturnImportOrderServiceInterface $service)
    {
        $this->service = $service;
    }
    
    abstract public function handle(ReturnImportOrderPayload $payload, \Closure $next): ReturnImportOrderPayload;
    
    protected function getService(): ReturnImportOrderServiceInterface
    {
        return $this->service;
    }
    
    /**
     * Get repositories through service's public methods (không dùng Reflection)
     * Service sẽ expose các repos qua public methods trong Interface để đảm bảo:
     * - Type safety: Compile-time checking
     * - Security: Không bypass encapsulation
     * - Maintainability: Dễ refactor và test
     * - No deprecation warnings: Không dùng Reflection deprecated methods
     */
    protected function getRepository()
    {
        return $this->service->getRepository();
    }
    
    protected function getImportOrderRepo()
    {
        return $this->service->getImportOrderRepo();
    }
    
    protected function getWarehouseStockRepo()
    {
        return $this->service->getWarehouseStockRepo();
    }
    
    protected function getWarehouseStockLogRepo()
    {
        return $this->service->getWarehouseStockLogRepo();
    }
    
    protected function getVariantWarehouseStockRepo()
    {
        return $this->service->getVariantWarehouseStockRepo();
    }
    
    protected function getVariantWarehouseStockLogRepo()
    {
        return $this->service->getVariantWarehouseStockLogRepo();
    }
    
    protected function getBatchWarehouseRepo()
    {
        return $this->service->getBatchWarehouseRepo();
    }
    
    protected function getBatchStockLogRepo()
    {
        return $this->service->getBatchStockLogRepo();
    }
}

