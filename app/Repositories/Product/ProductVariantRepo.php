<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductVariant;

class ProductVariantRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductVariant $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

}

