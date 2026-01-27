<?php

namespace App\Repositories\Setting;

use App\Repositories\BaseRepo;
use App\Models\SystemCatalogue;

class SystemCatalogueRepo extends BaseRepo
{
    protected $model;

    public function __construct(SystemCatalogue $model)
    {
        $this->model = $model;
        parent::__construct($model);
    }
}
