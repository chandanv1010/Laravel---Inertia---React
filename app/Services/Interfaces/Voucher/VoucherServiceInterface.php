<?php

namespace App\Services\Interfaces\Voucher;

use App\Services\Interfaces\BaseServiceInterface;

interface VoucherServiceInterface extends BaseServiceInterface
{
    /**
     * Generate unique voucher code
     */
    public function generateCode(): string;

    /**
     * Check if voucher code is available
     */
    public function isCodeAvailable(string $code, ?int $excludeId = null): bool;
    
    /**
     * Lấy voucher đang active để hiển thị trên frontend
     */
    public function getActiveVoucherForDisplay(): ?array;

    /**
     * Lấy danh sách voucher áp dụng cho sản phẩm cụ thể
     */
    public function getApplicableVouchersForProduct(int $productId): array;
}
