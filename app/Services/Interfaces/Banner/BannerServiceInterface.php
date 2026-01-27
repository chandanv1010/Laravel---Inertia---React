<?php

namespace App\Services\Interfaces\Banner;

use App\Services\Interfaces\BaseServiceInterface;

interface BannerServiceInterface extends BaseServiceInterface
{
    public function saveWithSlides($request, $id = null);
    public function getByCode(string $code);
    public function getMultipleByCodes(array $codes): array;
}
