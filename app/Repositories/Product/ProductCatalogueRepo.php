<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductCatalogue;

class ProductCatalogueRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductCatalogue $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }


}

