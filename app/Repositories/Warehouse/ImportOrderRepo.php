<?php

namespace App\Repositories\Warehouse;

use App\Repositories\BaseRepo;
use App\Models\ImportOrder;

class ImportOrderRepo extends BaseRepo {
    
    public function __construct(ImportOrder $model) {
        parent::__construct($model);
    }
}
