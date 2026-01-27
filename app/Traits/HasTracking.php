<?php

namespace App\Traits;

use App\Services\Interfaces\Log\LogServiceInterface;
use Illuminate\Support\Facades\App;

trait HasTracking
{
    /**
     * Get LogService instance
     */
    protected function getLogService(): LogServiceInterface
    {
        return App::make(LogServiceInterface::class);
    }

    /**
     * Log an action
     *
     * @param string $action Action name (create, update, delete, etc.)
     * @param string $module Module name
     * @param mixed $record Record being acted upon (optional)
     * @param array $data Additional data
     * @param string $status Status (success, failed, pending)
     * @param string|null $errorMessage Error message if failed
     * @return bool
     */
    protected function trackAction(string $action, string $module, $record = null, array $data = [], string $status = 'success', ?string $errorMessage = null): bool
    {
        // Kiểm tra config tracking enabled
        if (!config('tracking.enabled', true)) {
            return false;
        }

        try {
            $logService = $this->getLogService();
            return $logService->log($action, $module, $record, $data, $status, $errorMessage);
        } catch (\Throwable $th) {
            // Không throw exception để không ảnh hưởng đến main action
            return false;
        }
    }

    /**
     * Track create action
     */
    protected function trackCreate(string $module, $record, array $data = []): bool
    {
        $trackData = array_merge($data, [
            'new_data' => $record->toArray() ?? null,
            'description' => $data['description'] ?? "Tạo mới {$module}",
        ]);

        return $this->trackAction('create', $module, $record, $trackData);
    }

    /**
     * Track update action
     */
    protected function trackUpdate(string $module, $record, array $oldData = [], array $changes = [], array $data = []): bool
    {
        $trackData = array_merge($data, [
            'old_data' => $oldData,
            'new_data' => $record->toArray() ?? null,
            'changes' => $changes,
            'description' => $data['description'] ?? "Cập nhật {$module}",
        ]);

        return $this->trackAction('update', $module, $record, $trackData);
    }

    /**
     * Track delete action
     */
    protected function trackDelete(string $module, $record, array $data = []): bool
    {
        $trackData = array_merge($data, [
            'old_data' => $record->toArray() ?? null,
            'description' => $data['description'] ?? "Xóa {$module}",
        ]);

        return $this->trackAction('delete', $module, $record, $trackData);
    }

    /**
     * Track view action
     */
    protected function trackView(string $module, $record = null, array $data = []): bool
    {
        $trackData = array_merge($data, [
            'description' => $data['description'] ?? "Xem {$module}",
        ]);

        return $this->trackAction('view', $module, $record, $trackData);
    }

    /**
     * Track failed action
     */
    protected function trackFailed(string $action, string $module, $record = null, string $errorMessage, array $data = []): bool
    {
        $trackData = array_merge($data, [
            'description' => $data['description'] ?? "Thao tác {$action} {$module} thất bại",
        ]);

        return $this->trackAction($action, $module, $record, $trackData, 'failed', $errorMessage);
    }
}

