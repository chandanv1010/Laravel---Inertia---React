<?php

namespace App\Repositories\Setting;

use App\Repositories\BaseRepo;
use App\Models\System;

class SystemRepo extends BaseRepo
{
    protected $model;

    public function __construct(System $model)
    {
        $this->model = $model;
        parent::__construct($model);
    }
}
