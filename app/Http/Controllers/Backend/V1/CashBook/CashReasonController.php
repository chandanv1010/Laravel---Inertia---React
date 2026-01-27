<?php

namespace App\Http\Controllers\Backend\V1\CashBook;

use App\Http\Controllers\Backend\BaseController;
use App\Http\Requests\CashBook\CashReason\StoreRequest;
use App\Http\Requests\CashBook\CashReason\UpdateRequest;
use App\Services\Interfaces\CashBook\CashReasonServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Lang;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class CashReasonController extends BaseController
{
    use AuthorizesRequests;

    /** @var \App\Services\Interfaces\CashBook\CashReasonServiceInterface */
    protected $service;

    public function __construct(CashReasonServiceInterface $service)
    {
        $this->service = $service;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách lý do thu chi
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'cash_book_reason:index');

        $reasons = $this->service->paginate($request);

        return Inertia::render('backend/cash-book/reason/index', [
            'reasons' => $reasons,
            'filters' => $request->only(['keyword', 'type', 'publish']),
        ]);
    }

    /**
     * Hiển thị form tạo mới lý do thu chi
     *
     * @return Response
     */
    public function create(): Response
    {
        $this->authorize('modules', 'cash_book_reason:store');

        return Inertia::render('backend/cash-book/reason/create');
    }

    /**
     * Lưu lý do thu chi mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse
    {
        $this->authorize('modules', 'cash_book_reason:store');

        $response = $this->service->save($request);
        
        return $this->handleAction($request, $response, redirectRoute: 'cash-book.reason.index');
    }

    /**
     * Hiển thị chi tiết lý do thu chi
     *
     * @param string $id
     * @return Response
     */
    public function show(string $id): Response
    {
        $this->authorize('modules', 'cash_book_reason:show');

        $reason = $this->service->show($id);
        
        return Inertia::render('backend/cash-book/reason/show', [
            'reason' => $reason,
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa lý do thu chi
     *
     * @param string $id
     * @return Response
     */
    public function edit(string $id): Response
    {
        $this->authorize('modules', 'cash_book_reason:update');

        $reason = $this->service->show($id);
        
        return Inertia::render('backend/cash-book/reason/edit', [
            'reason' => $reason,
        ]);
    }

    /**
     * Cập nhật lý do thu chi
     *
     * @param UpdateRequest $request
     * @param string $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, string $id): RedirectResponse
    {
        $this->authorize('modules', 'cash_book_reason:update');

        $response = $this->service->save($request, $id);
        
        return $this->handleAction($request, $response, redirectRoute: 'cash-book.reason.index', editRoute: 'cash-book.reason.edit');
    }

    /**
     * Xóa lý do thu chi
     *
     * @param string $id
     * @return RedirectResponse
     */
    public function destroy(string $id): RedirectResponse
    {
        $this->authorize('modules', 'cash_book_reason:delete');

        $response = $this->service->destroy($id);
        
        if ($response) {
            return redirect()->route('cash-book.reason.index')
                ->with('success', Lang::get('messages.delete_success'));
        }

        return redirect()->back()
            ->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều lý do thu chi cùng lúc
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function bulkUpdate(Request $request): RedirectResponse
    {
        $this->authorize('modules', 'cash_book_reason:bulkUpdate');

        $response = $this->service->bulkUpdate($request);
        
        return $response 
            ? redirect()->back()->with('success', Lang::get('messages.save_success'))
            : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Lấy danh sách lý do thu chi dạng dropdown
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function dropdown(Request $request)
    {
        $type = $request->input('type');
        $reasons = $this->service->getDropdown($type);
        
        return response()->json($reasons);
    }
}
