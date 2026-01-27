<?php

namespace App\Services\Impl\V1\Log;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Log\LogServiceInterface;
use App\Repositories\Log\LogRepo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LogService extends BaseCacheService implements LogServiceInterface
{
    // Cache strategy: 'hot_queries' phù hợp cho logs vì cần query thường xuyên nhưng không cần cache lâu
    // Hoặc có thể không cache vì logs thay đổi liên tục
    protected string $cacheStrategy = 'hot_queries';
    protected string $module = 'logs';

    protected $repository;

    protected $with = ['user'];
    protected $simpleFilter = ['status', 'action', 'module', 'user_id'];
    protected $dateFilter = ['created_at', 'updated_at'];
    protected $searchFields = ['description', 'module', 'action'];
    protected $sort = ['id', 'desc'];

    public function __construct(LogRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static
    {
        // Không cần implement vì không dùng save() method từ BaseService
        return $this;
    }

    /**
     * Log an action
     */
    public function log(string $action, string $module, $record = null, array $data = [], string $status = 'success', ?string $errorMessage = null): bool
    {
        // Kiểm tra config tracking enabled
        if (!config('tracking.enabled', true)) {
            return false;
        }

        try {
            $request = request();
            $user = Auth::user();

            $logData = [
                'user_id' => $user?->id,
                'action' => $action,
                'module' => $module,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'description' => $data['description'] ?? $this->generateDescription($action, $module, $record),
                'old_data' => $data['old_data'] ?? null,
                'new_data' => $data['new_data'] ?? null,
                'changes' => $data['changes'] ?? null,
                'status' => $status,
                'error_message' => $errorMessage,
                'route' => $request->route()?->getName(),
                'method' => $request->method(),
            ];
            
            // Debug log
            \Illuminate\Support\Facades\Log::info('LogService::log called', [
                'action' => $action,
                'module' => $module,
                'user_id' => $user?->id,
            ]);

            // Lưu filter/search/sort parameters vào changes field nếu có
            if (isset($data['filter_params']) || isset($data['search']) || isset($data['sort']) || isset($data['page'])) {
                $logData['changes'] = array_merge($logData['changes'] ?? [], [
                    'filters' => $data['filter_params'] ?? null,
                    'search' => $data['search'] ?? null,
                    'sort' => $data['sort'] ?? null,
                    'page' => $data['page'] ?? null,
                ]);
            }

            // Nếu có record, lưu record_id và record_type
            if ($record) {
                $logData['record_id'] = is_object($record) ? $record->id : $record;
                $logData['record_type'] = is_object($record) ? get_class($record) : ($data['record_type'] ?? null);
            }

            // Lưu log (không dùng transaction để tránh rollback log nếu main action fail)
            $result = $this->repository->create($logData);
            
            \Illuminate\Support\Facades\Log::info('LogService::log - Entry created', [
                'log_id' => $result?->id,
                'action' => $action,
                'module' => $module,
            ]);

            return true;
        } catch (\Throwable $th) {
            // Không throw exception để không ảnh hưởng đến main action
            // Log vào Laravel log để debug
            \Illuminate\Support\Facades\Log::error('Failed to log action', [
                'action' => $action,
                'module' => $module,
                'error' => $th->getMessage(),
                'trace' => $th->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Generate description from action, module, and record
     */
    private function generateDescription(string $action, string $module, $record = null): string
    {
        $actionLabels = [
            'create' => 'Tạo mới',
            'update' => 'Cập nhật',
            'delete' => 'Xóa',
            'view' => 'Xem',
            'translate' => 'Dịch',
            'restore' => 'Khôi phục',
            'force_delete' => 'Xóa vĩnh viễn',
        ];

        $moduleLabels = [
            'post' => 'Bài viết',
            'post_catalogue' => 'Nhóm bài viết',
            'user' => 'Người dùng',
            'user_catalogue' => 'Nhóm người dùng',
            'permission' => 'Quyền',
            'language' => 'Ngôn ngữ',
        ];

        $actionLabel = $actionLabels[$action] ?? $action;
        $moduleLabel = $moduleLabels[$module] ?? $module;

        $description = "{$actionLabel} {$moduleLabel}";

        if ($record && is_object($record)) {
            if (isset($record->name)) {
                $description .= ": {$record->name}";
            } elseif (isset($record->id)) {
                $description .= " (ID: {$record->id})";
            }
        }

        return $description;
    }

    /**
     * Delete logs older than specified months
     */
    public function deleteOlderThan(int $months = 6): int
    {
        $cutoffDate = now()->subMonths($months);
        
        return DB::table('logs')
            ->where('created_at', '<', $cutoffDate)
            ->delete();
    }

    /**
     * Delete logs within last N days
     */
    public function deleteLastNDays(int $days = 7): int
    {
        $startDate = now()->subDays($days);
        
        return DB::table('logs')
            ->where('created_at', '>=', $startDate)
            ->delete();
    }
}

