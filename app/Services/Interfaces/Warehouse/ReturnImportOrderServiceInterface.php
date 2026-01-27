<?php

namespace App\Services\Interfaces\Warehouse;

use App\Services\Interfaces\BaseServiceInterface;

interface ReturnImportOrderServiceInterface extends BaseServiceInterface
{
    /**
     * Trả hàng theo đơn nhập - lấy sản phẩm từ đơn nhập đã chọn
     */
    public function returnByOrder(int $importOrderId, array $data);

    /**
     * Trả hàng không theo đơn - tự chọn sản phẩm trả
     */
    public function returnWithoutOrder(array $data);

    /**
     * Xuất kho khi trả hàng - trừ tồn kho
     */
    public function exportToStock(int $id);

    /**
     * Xác nhận đã nhận hoàn tiền từ NCC
     */
    public function confirmRefund(int $id);

    /**
     * Lấy danh sách đơn nhập đã hoàn thành để chọn trả hàng
     */
    public function getCompletedImportOrders(array $filters = []);

    /**
     * Lấy chi tiết đơn nhập để trả hàng
     */
    public function getImportOrderDetails(int $importOrderId);
    
    /**
     * Expose repositories to Pipeline Pipes (thay vì dùng Reflection)
     * Các methods này cho phép pipes truy cập repos một cách an toàn và type-safe
     */
    public function getRepository();
    public function getImportOrderRepo();
    public function getWarehouseStockRepo();
    public function getWarehouseStockLogRepo();
    public function getVariantWarehouseStockRepo();
    public function getVariantWarehouseStockLogRepo();
    public function getBatchWarehouseRepo();
    public function getBatchStockLogRepo();
}
