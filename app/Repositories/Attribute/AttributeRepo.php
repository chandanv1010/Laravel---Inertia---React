<?php

namespace App\Repositories\Attribute;

use App\Repositories\BaseRepo;
use App\Models\Attribute;

class AttributeRepo extends BaseRepo
{
    protected $model;

    public function __construct(Attribute $model)
    {
        $this->model = $model;
    }
}
