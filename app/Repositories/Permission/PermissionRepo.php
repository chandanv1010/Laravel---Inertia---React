<?php  
namespace App\Repositories\Permission;

use App\Repositories\BaseRepo;
use App\Models\Permission;

class PermissionRepo extends BaseRepo {
    protected $model;

    public function __construct(
        Permission $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }


}