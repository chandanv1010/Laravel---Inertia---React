<?php  
namespace App\Repositories\User;

use App\Repositories\BaseRepo;
use App\Models\UserCatalogue;

class UserCatalogueRepo extends BaseRepo {
    protected $model;

    public function __construct(
        UserCatalogue $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }


}