<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductVariantWarehouseStock;

class ProductVariantWarehouseStockRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductVariantWarehouseStock $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

    /**
     * Find stock by variant_id and warehouse_id
     */
    public function findByVariantAndWarehouse(int $variantId, int $warehouseId)
    {
        return $this->model
            ->where('product_variant_id', $variantId)
            ->where('warehouse_id', $warehouseId)
            ->first();
    }

    /**
     * Update or create warehouse stock
     */
    public function updateOrCreateStock(array $attributes, array $values)
    {
        return $this->model->updateOrCreate($attributes, $values)->fresh();
    }
}
