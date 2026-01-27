<?php

namespace App\Repositories\Banner;

use App\Repositories\BaseRepo;
use App\Models\Slide;

class SlideRepo extends BaseRepo {
    
    public function __construct(Slide $model) {
        parent::__construct($model);
    }

    /**
     * Get slides by banner ID
     */
    public function getByBannerId(int $bannerId)
    {
        return $this->model->where('banner_id', $bannerId)
            ->orderBy('order')
            ->get();
    }

    /**
     * Delete all slides for a banner
     */
    public function deleteByBannerId(int $bannerId)
    {
        return $this->model->where('banner_id', $bannerId)->delete();
    }
}
