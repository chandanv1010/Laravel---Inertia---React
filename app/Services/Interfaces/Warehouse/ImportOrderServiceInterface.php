<?php

namespace App\Services\Interfaces\Warehouse;

use App\Services\Interfaces\BaseServiceInterface;

interface ImportOrderServiceInterface extends BaseServiceInterface
{
    public function getDropdown();
    public function importToStock(int $id);
    public function cancel(int $id);
    public function restore(int $id);
    
    /**
     * Expose repositories to Pipeline Pipes (thay vì dùng Reflection)
     * Các methods này cho phép pipes truy cập repos một cách an toàn và type-safe
     */
    public function getRepository();
    public function getWarehouseStockRepo();
    public function getWarehouseStockLogRepo();
    public function getVariantWarehouseStockRepo();
    public function getVariantWarehouseStockLogRepo();
    public function getBatchWarehouseRepo();
    public function getBatchStockLogRepo();
}
