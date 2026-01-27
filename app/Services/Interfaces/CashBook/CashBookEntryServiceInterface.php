<?php

namespace App\Services\Interfaces\CashBook;

use App\Services\Interfaces\BaseServiceInterface;

interface CashBookEntryServiceInterface extends BaseServiceInterface
{
    /**
     * Get cash book statistics
     */
    public function getStatistics(array $filters = []): array;
}

