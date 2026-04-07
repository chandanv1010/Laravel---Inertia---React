<?php

namespace App\Services\Interfaces\Inventory;

use App\Models\Order;

interface InventoryServiceInterface
{
    /**
     * Hoàn lại tồn kho từ một đơn hàng (thường khi đơn hàng bị hủy)
     */
    public function restoreOrderInventory(Order $order): bool;

    /**
     * Trừ lại tồn kho cho đơn hàng (thường khi đơn hàng được kích hoạt lại sau khi hủy)
     */
    public function deductOrderInventory(Order $order): bool;
}
