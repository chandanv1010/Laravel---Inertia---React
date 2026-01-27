<?php

namespace App\Services\Interfaces\CashBook;

use App\Services\Interfaces\BaseServiceInterface;

/**
 * Interface CashReasonServiceInterface
 * @package App\Services\Interfaces\CashBook
 */
interface CashReasonServiceInterface extends BaseServiceInterface
{
    /**
     * Get dropdown data for reasons
     */
    public function getDropdown(string $type = null);

    /**
     * Get reasons by type
     */
    public function getByType(string $type);

    /**
     * Get default reason for type
     */
    public function getDefaultByType(string $type);
}
