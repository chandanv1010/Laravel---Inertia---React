<?php

namespace App\Http\Controllers\Backend\V1\Setting;

use App\Http\Controllers\Backend\BaseController;
use App\Services\Interfaces\Log\LogServiceInterface;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use App\Http\Resources\Log\LogResource;
use Illuminate\Http\Request;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Lang;

class LogController extends BaseController
{
    private $userService;

    public function __construct(
        LogServiceInterface $service,
        UserService $userService
    )
    {
        parent::__construct($service);
        $this->userService = $userService;
    }

    /**
     * Hiển thị danh sách log
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'log:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));

        return Inertia::render('backend/log/index', [
            'records' => LogResource::collection($records)->resource,
            'users' => $users,
        ]);
    }

    /**
     * Xóa log cũ hơn số tháng chỉ định
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function deleteOlderThan(Request $request): RedirectResponse
    {
        $this->authorize('modules', 'log:delete');
        
        $months = (int) $request->input('months', 6);
        
        if ($months < 1 || $months > 12) {
            return redirect()->back()->with('error', 'Số tháng không hợp lệ (1-12)');
        }

        $deletedCount = $this->service->deleteOlderThan($months);

        return redirect()->back()->with('success', Lang::get('messages.delete_success') . " ({$deletedCount} bản ghi)");
    }

    /**
     * Xóa log trong N ngày gần nhất
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function deleteLastNDays(Request $request): RedirectResponse
    {
        $this->authorize('modules', 'log:delete');
        
        $days = (int) $request->input('days', 7);
        
        if ($days < 1 || $days > 30) {
            return redirect()->back()->with('error', 'Số ngày không hợp lệ (1-30)');
        }

        $deletedCount = $this->service->deleteLastNDays($days);

        return redirect()->back()->with('success', Lang::get('messages.delete_success') . " ({$deletedCount} bản ghi)");
    }

    /**
     * Làm mới cache cho log
     *
     * @return RedirectResponse
     */
    public function refreshCache(): RedirectResponse
    {
        $this->authorize('modules', 'log:refresh-cache');
        
        $this->service->invalidateCache();
        
        return redirect()->back()->with('success', 'Đã làm mới cache và tải lại dữ liệu log');
    }
}
