<?php

namespace App\Services\Interfaces\Setting;

interface TaxSettingServiceInterface
{
    /**
     * Lấy cấu hình thuế (global) cho UI/logic.
     *
     * @return array{
     *   enabled: bool,
     *   price_includes_tax: bool,
     *   default_tax_on_sale: bool,
     *   default_tax_on_purchase: bool,
     *   sale_tax_rate: float,
     *   purchase_tax_rate: float
     * }
     */
    public function get(): array;

    /**
     * Lưu cấu hình thuế (global).
     */
    public function update(array $payload): bool;
}

