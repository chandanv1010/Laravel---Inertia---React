<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductBatchWarehouse;

class ProductBatchWarehouseRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductBatchWarehouse $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

    /**
     * Find stock by batch_id and warehouse_id
     */
    public function findByBatchAndWarehouse(int $batchId, int $warehouseId)
    {
        return $this->model
            ->where('product_batch_id', $batchId)
            ->where('warehouse_id', $warehouseId)
            ->first();
    }

    /**
     * Update or create batch warehouse stock
     */
    public function updateOrCreateStock(array $attributes, array $values)
    {
        return $this->model->updateOrCreate($attributes, $values)->fresh();
    }

    /**
     * Find first warehouse stock with quantity > 0 for a batch
     */
    public function findFirstWithStock(int $batchId)
    {
        return $this->model
            ->where('product_batch_id', $batchId)
            ->where('stock_quantity', '>', 0)
            ->orderBy('id')
            ->first();
    }

    /**
     * Lock and find warehouse stock for update
     */
    public function lockAndFind(int $batchId, int $warehouseId)
    {
        return $this->model
            ->lockForUpdate()
            ->where('product_batch_id', $batchId)
            ->where('warehouse_id', $warehouseId)
            ->first();
    }

    /**
     * Lock and find or create warehouse stock
     */
    public function lockAndFindOrNew(int $batchId, int $warehouseId)
    {
        return $this->model
            ->lockForUpdate()
            ->firstOrNew([
                'product_batch_id' => $batchId,
                'warehouse_id' => $warehouseId,
            ]);
    }
}
