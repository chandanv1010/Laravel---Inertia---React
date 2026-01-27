<?php

namespace App\Services\Interfaces\Warehouse;

use App\Services\Interfaces\BaseServiceInterface;

interface WarehouseServiceInterface extends BaseServiceInterface
{
    public function getDropdown();
    
    /**
     * Get default warehouse ID (chi nhánh chính - code MAIN)
     * 
     * @return int|null
     */
    public function getDefaultWarehouseId(): ?int;
}
