<?php  
namespace App\Repositories\Customer;

use App\Repositories\BaseRepo;
use App\Models\Customer;

class CustomerRepo extends BaseRepo {
    protected $model;

    public function __construct(
        Customer $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }
}
