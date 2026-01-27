<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductVariantWarehouseStockLog;

class ProductVariantWarehouseStockLogRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductVariantWarehouseStockLog $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }
}
