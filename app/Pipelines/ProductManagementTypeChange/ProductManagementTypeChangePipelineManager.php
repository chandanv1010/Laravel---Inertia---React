<?php

namespace App\Pipelines\ProductManagementTypeChange;

use App\Pipelines\ProductManagementTypeChange\Payloads\ProductManagementTypeChangePayload;
use App\Pipelines\ProductManagementTypeChange\Pipes\AbstractProductManagementTypeChangePipe;
use App\Pipelines\ProductManagementTypeChange\Pipes\ValidateChangePipe;
use App\Pipelines\ProductManagementTypeChange\Pipes\LoadProductDataPipe;
use App\Pipelines\ProductManagementTypeChange\Pipes\ConvertProductBasicToBatchPipe;
use App\Pipelines\ProductManagementTypeChange\Pipes\ConvertProductBatchToBasicPipe;
use App\Pipelines\ProductManagementTypeChange\Pipes\ConvertVariantsBasicToBatchPipe;
use App\Pipelines\ProductManagementTypeChange\Pipes\ConvertVariantsBatchToBasicPipe;
use App\Pipelines\ProductManagementTypeChange\Pipes\ClearCachePipe;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface;
use Illuminate\Pipeline\Pipeline;
use Illuminate\Support\Facades\DB;

class ProductManagementTypeChangePipelineManager
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
    
    /**
     * Process management type change với transaction để đảm bảo atomicity
     */
    public function process(ProductManagementTypeChangePayload $payload): ProductManagementTypeChangePayload
    {
        // Set services reference in payload
        $payload->setServices($this->productService, $this->variantService, $this->warehouseService);
        
        // Wrap toàn bộ pipeline trong transaction để đảm bảo atomicity
        return DB::transaction(function () use ($payload) {
            $pipes = $this->getPipes();
            
            return app(Pipeline::class)
                ->send($payload)
                ->through($pipes)
                ->thenReturn();
        });
    }
    
    /**
     * Get pipes sequence cho việc chuyển đổi management type
     * Flow: validate -> load data -> convert (product/variants) -> clear cache
     */
    protected function getPipes(): array
    {
        return [
            new ValidateChangePipe($this->productService, $this->variantService, $this->warehouseService),
            new LoadProductDataPipe($this->productService, $this->variantService, $this->warehouseService),
            // Product level conversion (chỉ chạy nếu không có variants)
            new ConvertProductBasicToBatchPipe($this->productService, $this->variantService, $this->warehouseService),
            new ConvertProductBatchToBasicPipe($this->productService, $this->variantService, $this->warehouseService),
            // Variants level conversion (chỉ chạy nếu có variants)
            new ConvertVariantsBasicToBatchPipe($this->productService, $this->variantService, $this->warehouseService),
            new ConvertVariantsBatchToBasicPipe($this->productService, $this->variantService, $this->warehouseService),
            // Clear cache sau cùng
            new ClearCachePipe($this->productService, $this->variantService, $this->warehouseService),
        ];
    }
}
