<?php

namespace App\Services\Interfaces\Setting;

use App\Services\Interfaces\BaseServiceInterface;

interface SystemServiceInterface extends BaseServiceInterface
{
    public function getSystemHierarchy();
    public function updateValues(array $payload);
    public function getSeoConfig();
    public function getAllConfig();
}
