<?php  
namespace App\Repositories\PaymentMethod;

use App\Repositories\BaseRepo;
use App\Models\PaymentMethod;

class PaymentMethodRepo extends BaseRepo {
    
    protected $model;

    public function __construct(
        PaymentMethod $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

}

