<?php  
namespace App\Repositories\User;

use App\Repositories\BaseRepo;
use App\Models\User;

class UserRepo extends BaseRepo {
    protected $model;

    public function __construct(
        User $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }


}