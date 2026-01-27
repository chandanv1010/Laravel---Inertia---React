<?php

namespace App\Repositories\CashBook;

use App\Repositories\BaseRepo;
use App\Models\CashReason;

class CashReasonRepo extends BaseRepo {
    
    public function __construct(CashReason $model) {
        parent::__construct($model);
    }
}
