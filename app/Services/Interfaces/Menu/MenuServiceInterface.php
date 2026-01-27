<?php

namespace App\Services\Interfaces\Menu;

use App\Services\Interfaces\BaseServiceInterface;

interface MenuServiceInterface extends BaseServiceInterface
{
    public function saveWithItems($request, $id = null);
    public function reorderItems($request);
    public function getNestedItems($menuId);
}
