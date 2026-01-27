<?php

namespace App\Repositories\Widget;

use App\Repositories\BaseRepo;
use App\Models\Widget;

class WidgetRepo extends BaseRepo {
    
    public function __construct(Widget $model) {
        parent::__construct($model);
    }
}
