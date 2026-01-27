<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use App\Services\Interfaces\Warehouse\ImportOrderServiceInterface;

abstract class AbstractImportOrderPipe
{
    protected ImportOrderServiceInterface $service;
    
    public function __construct(ImportOrderServiceInterface $service)
    {
        $this->service = $service;
    }
    
    abstract public function handle(ImportOrderPayload $payload, \Closure $next): ImportOrderPayload;
    
    protected function getService(): ImportOrderServiceInterface
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
