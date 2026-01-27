<?php

namespace App\Repositories\Attribute;

use App\Repositories\BaseRepo;
use App\Models\AttributeCatalogue;

class AttributeCatalogueRepo extends BaseRepo
{
    protected $model;

    public function __construct(AttributeCatalogue $model)
    {
        $this->model = $model;
    }
}
