<?php

namespace App\Repositories\Core;

use App\Repositories\BaseRepo;
use App\Models\Tag;

class TagRepo extends BaseRepo
{
    protected $model;

    public function __construct(Tag $model)
    {
        $this->model = $model;
    }
}
