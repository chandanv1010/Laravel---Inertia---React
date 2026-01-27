<?php

namespace App\Repositories\Warehouse;

use App\Repositories\BaseRepo;
use App\Models\ReturnImportOrder;

class ReturnImportOrderRepo extends BaseRepo {
    
    public function __construct(ReturnImportOrder $model) {
        parent::__construct($model);
    }
}
