<?php

namespace App\Repositories\Menu;

use App\Repositories\BaseRepo;
use App\Models\MenuItem;

class MenuItemRepo extends BaseRepo {
    
    public function __construct(MenuItem $model) {
        parent::__construct($model);
    }

    /**
     * Get items by menu ID with nested children
     */
    public function getNestedByMenuId($menuId) {
        return $this->model
            ->where('menu_id', $menuId)
            ->whereNull('parent_id')
            ->with('allChildren')
            ->orderBy('order')
            ->get();
    }

    /**
     * Delete all items by menu ID
     */
    public function deleteByMenuId($menuId) {
        return $this->model->where('menu_id', $menuId)->delete();
    }
}
