<?php

namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\PricingTier;

class PricingTierRepo extends BaseRepo
{
    protected $model;

    public function __construct(PricingTier $model)
    {
        $this->model = $model;
        parent::__construct($model);
    }
}

