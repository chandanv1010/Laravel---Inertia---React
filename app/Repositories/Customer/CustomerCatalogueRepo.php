<?php  
namespace App\Repositories\Customer;

use App\Repositories\BaseRepo;
use App\Models\CustomerCatalogue;

class CustomerCatalogueRepo extends BaseRepo {
    protected $model;

    public function __construct(
        CustomerCatalogue $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }
}
