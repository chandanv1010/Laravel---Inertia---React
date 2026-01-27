<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductWarehouseStockLog;

class ProductWarehouseStockLogRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductWarehouseStockLog $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }
}
