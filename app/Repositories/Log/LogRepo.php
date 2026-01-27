<?php

namespace App\Repositories\Log;

use App\Repositories\BaseRepo;
use App\Models\Log;

class LogRepo extends BaseRepo
{
    protected $model;

    public function __construct(Log $model)
    {
        $this->model = $model;
        parent::__construct($model);
    }
}

