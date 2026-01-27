<?php

namespace App\Repositories\Warehouse;

use App\Repositories\BaseRepo;
use App\Models\Warehouse;

class WarehouseRepo extends BaseRepo {
    
    public function __construct(Warehouse $model) {
        parent::__construct($model);
    }
}
