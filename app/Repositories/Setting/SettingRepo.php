<?php

namespace App\Repositories\Setting;

use App\Models\Setting;
use App\Repositories\BaseRepo;

class SettingRepo extends BaseRepo
{
    protected $model;

    public function __construct(Setting $model)
    {
        $this->model = $model;
        parent::__construct($model);
    }
}

