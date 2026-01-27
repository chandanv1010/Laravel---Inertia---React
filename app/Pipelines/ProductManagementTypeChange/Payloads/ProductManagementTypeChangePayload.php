<?php

namespace App\Pipelines\ProductManagementTypeChange\Payloads;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductManagementTypeChangePayload
{
    public int $productId;
    public string $oldManagementType;
    public string $newManagementType;
    
    public ?Product $product = null;
    public array $variants = [];
    
    // Flags
    public bool $hasVariants = false;
    public bool $isProductLevelChange = false;
    public bool $isVariantLevelChange = false;
    
    // Service references (injected)
    public $productService = null;
    public $variantService = null;
    public $warehouseService = null;
    
    public function __construct(int $productId, string $oldManagementType, string $newManagementType)
    {
        $this->productId = $productId;
        $this->oldManagementType = $oldManagementType;
        $this->newManagementType = $newManagementType;
    }
    
    public function setProduct(Product $product): self
    {
        $this->product = $product;
        return $this;
    }
    
    public function getProduct(): ?Product
    {
        return $this->product;
    }
    
    public function setVariants(array $variants): self
    {
        $this->variants = $variants;
        $this->hasVariants = count($variants) > 0;
        return $this;
    }
    
    public function getVariants(): array
    {
        return $this->variants;
    }
    
    public function setServices($productService, $variantService, $warehouseService): self
    {
        $this->productService = $productService;
        $this->variantService = $variantService;
        $this->warehouseService = $warehouseService;
        return $this;
    }
    
    /**
     * Check if conversion is from basic to batch
     */
    public function isBasicToBatch(): bool
    {
        return $this->oldManagementType !== 'batch' && $this->newManagementType === 'batch';
    }
    
    /**
     * Check if conversion is from batch to basic
     */
    public function isBatchToBasic(): bool
    {
        return $this->oldManagementType === 'batch' && $this->newManagementType !== 'batch';
    }
}
