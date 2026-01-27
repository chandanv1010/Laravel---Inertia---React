<?php

namespace App\Repositories\Banner;

use App\Repositories\BaseRepo;
use App\Models\Banner;

class BannerRepo extends BaseRepo {
    
    public function __construct(Banner $model) {
        parent::__construct($model);
    }
}
