<?php  
namespace App\Repositories\Order;

use App\Repositories\BaseRepo;
use App\Models\Order;

class OrderRepo extends BaseRepo {
    protected $model;

    public function __construct(
        Order $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }
}
