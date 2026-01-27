<?php

namespace App\Services\Interfaces\CashBook;

use App\Services\Interfaces\BaseServiceInterface;

/**
 * Interface CashTransactionServiceInterface
 * @package App\Services\Interfaces\CashBook
 */
interface CashTransactionServiceInterface extends BaseServiceInterface
{
    /**
     * Get transactions with filters
     */
    public function getWithFilters(array $filters = []);

    /**
     * Get balance statistics
     */
    public function getBalanceStats(array $filters = []);

    /**
     * Generate transaction code
     */
    public function generateTransactionCode(string $type): string;

    /**
     * Handle file uploads
     */
    public function handleAttachments(array $files): array;
}
