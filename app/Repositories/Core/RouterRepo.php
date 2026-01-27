<?php  
namespace App\Repositories\Core;

use App\Repositories\BaseRepo;
use App\Models\Router;

class RouterRepo extends BaseRepo {
    protected $model;

    public function __construct(
        Router $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }
}