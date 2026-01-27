<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductBrand;

class ProductBrandRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductBrand $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }


}

