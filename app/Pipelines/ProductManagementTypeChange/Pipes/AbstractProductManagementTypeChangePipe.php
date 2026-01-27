<?php

namespace App\Pipelines\ProductManagementTypeChange\Pipes;

use App\Pipelines\ProductManagementTypeChange\Payloads\ProductManagementTypeChangePayload;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface;

abstract class AbstractProductManagementTypeChangePipe
{
    protected ProductServiceInterface $productService;
    protected ProductVariantServiceInterface $variantService;
    protected WarehouseServiceInterface $warehouseService;
    
    public function __construct(
        ProductServiceInterface $productService,
        ProductVariantServiceInterface $variantService,
        WarehouseServiceInterface $warehouseService
    ) {
        $this->productService = $productService;
        $this->variantService = $variantService;
        $this->warehouseService = $warehouseService;
    }
    
    abstract public function handle(ProductManagementTypeChangePayload $payload, \Closure $next): ProductManagementTypeChangePayload;
    
    protected function getProductService(): ProductServiceInterface
    {
        return $this->productService;
    }
    
    protected function getVariantService(): ProductVariantServiceInterface
    {
        return $this->variantService;
    }
    
    protected function getWarehouseService(): WarehouseServiceInterface
    {
        return $this->warehouseService;
    }
}
