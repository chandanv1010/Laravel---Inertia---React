<?php

namespace App\Services\Interfaces\Warehouse;

use App\Services\Interfaces\BaseServiceInterface;

interface SupplierServiceInterface extends BaseServiceInterface
{
    public function getDropdown();
    
    /**
     * Get supplier info with debt calculation and import history
     */
    public function getSupplierInfo(int $supplierId, \Illuminate\Http\Request $request): array;
}
