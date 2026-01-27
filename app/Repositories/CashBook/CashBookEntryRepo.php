<?php

namespace App\Repositories\CashBook;

use App\Repositories\BaseRepo;
use App\Models\CashBookEntry;

class CashBookEntryRepo extends BaseRepo {
    
    public function __construct(CashBookEntry $model) {
        parent::__construct($model);
    }
}

