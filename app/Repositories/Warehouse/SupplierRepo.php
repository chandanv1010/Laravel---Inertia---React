<?php

namespace App\Repositories\Warehouse;

use App\Repositories\BaseRepo;
use App\Models\Supplier;

class SupplierRepo extends BaseRepo {
    
    public function __construct(Supplier $model) {
        parent::__construct($model);
    }
}
