<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductWarehouseStock;

class ProductWarehouseStockRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductWarehouseStock $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

    /**
     * Find stock by product_id and warehouse_id
     */
    public function findByProductAndWarehouse(int $productId, int $warehouseId)
    {
        return $this->model
            ->where('product_id', $productId)
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
