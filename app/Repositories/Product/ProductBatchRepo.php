<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductBatch;

class ProductBatchRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductBatch $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

    /**
     * Get batches for a product
     */
    public function getBatchesForProduct(int $productId)
    {
        return $this->model
            ->where('product_id', $productId)
            ->whereNull('product_variant_id')
            ->with('warehouseStocks.warehouse')
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Get batches for a variant
     */
    public function getBatchesForVariant(int $variantId)
    {
        return $this->model
            ->where('product_variant_id', $variantId)
            ->with('warehouseStocks.warehouse')
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Find default batch for a product
     */
    public function findDefaultBatchForProduct(int $productId)
    {
        return $this->model
            ->where('product_id', $productId)
            ->whereNull('product_variant_id')
            ->where('is_default', true)
            ->first();
    }

    /**
     * Find default batch for a variant
     */
    public function findDefaultBatchForVariant(int $variantId)
    {
        return $this->model
            ->where('product_variant_id', $variantId)
            ->where('is_default', true)
            ->first();
    }

    /**
     * Find any batch for a product
     */
    public function findAnyBatchForProduct(int $productId)
    {
        return $this->model
            ->where('product_id', $productId)
            ->whereNull('product_variant_id')
            ->first();
    }

    /**
     * Find any batch for a variant
     */
    public function findAnyBatchForVariant(int $variantId)
    {
        return $this->model
            ->where('product_variant_id', $variantId)
            ->first();
    }

    /**
     * Update all batches for a product to set is_default = false
     */
    public function unsetDefaultForProduct(int $productId)
    {
        return $this->model
            ->where('product_id', $productId)
            ->whereNull('product_variant_id')
            ->update(['is_default' => false]);
    }

    /**
     * Update all batches for a variant to set is_default = false
     */
    public function unsetDefaultForVariant(int $variantId)
    {
        return $this->model
            ->where('product_variant_id', $variantId)
            ->update(['is_default' => false]);
    }

    /**
     * Update or create batch for a product
     */
    public function updateOrCreateForProduct(int $productId, array $attributes, array $values)
    {
        return $this->model->updateOrCreate(
            array_merge(['product_id' => $productId, 'product_variant_id' => null], $attributes),
            $values
        );
    }

    /**
     * Update or create batch for a variant
     */
    public function updateOrCreateForVariant(int $variantId, int $productId, array $attributes, array $values)
    {
        return $this->model->updateOrCreate(
            array_merge(['product_variant_id' => $variantId], $attributes),
            array_merge(['product_id' => $productId], $values)
        );
    }

    /**
     * Lock batch for update
     */
    public function lockForUpdate(int $batchId)
    {
        return $this->model->lockForUpdate()->findOrFail($batchId);
    }
}

