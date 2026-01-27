<?php

namespace App\Services\Interfaces\Banner;

use App\Services\Interfaces\BaseServiceInterface;

interface SlideServiceInterface extends BaseServiceInterface
{
    public function saveWithElements($request, $id = null);
    public function getByBannerId(int $bannerId);
}
