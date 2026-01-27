<?php

namespace App\Services\Interfaces\Log;

use Illuminate\Http\Request;

interface LogServiceInterface
{
    /**
     * Log an action
     *
     * @param string $action Action name (create, update, delete, etc.)
     * @param string $module Module name (post, user, etc.)
     * @param mixed $record Record being acted upon (optional)
     * @param array $data Additional data (old_data, new_data, changes, etc.)
     * @param string $status Status (success, failed, pending)
     * @param string|null $errorMessage Error message if failed
     * @return bool
     */
    public function log(string $action, string $module, $record = null, array $data = [], string $status = 'success', ?string $errorMessage = null): bool;

    /**
     * Delete logs older than specified period
     *
     * @param int $months Number of months to keep (default: 6)
     * @return int Number of deleted logs
     */
    public function deleteOlderThan(int $months = 6): int;

    /**
     * Delete logs within last N days
     *
     * @param int $days Number of days
     * @return int Number of deleted logs
     */
    public function deleteLastNDays(int $days = 7): int;
}

