<?php

namespace App\Repositories\Menu;

use App\Repositories\BaseRepo;
use App\Models\Menu;

class MenuRepo extends BaseRepo {
    
    public function __construct(Menu $model) {
        parent::__construct($model);
    }
}
