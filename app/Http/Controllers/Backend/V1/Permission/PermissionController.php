<?php   
namespace App\Http\Controllers\Backend\V1\Permission;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Permission\Permission\StoreRequest;
use App\Http\Requests\Permission\Permission\UpdateRequest;
use App\Http\Requests\Permission\Permission\BulkDestroyRequest;
use App\Http\Requests\Permission\Permission\BulkUpdateRequest;
use App\Services\Interfaces\Permission\PermissionServiceInterface as PermissionService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Permission\PermissionResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class PermissionController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;

    public function __construct(
        PermissionService $service,
        UserService $userService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách quyền
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'permission:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request()->merge(['type' => 'all', 'sort' => 'name,asc']));
        return Inertia::render('backend/permission/permission/index', [
            'records' => $records,
            'users' => $users,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới quyền
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'permission:store');
        
        return Inertia::render('backend/permission/permission/save');
    }

    /**
     * Hiển thị form chỉnh sửa quyền
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'permission:update');
        $record = $this->service->show($id);
        
        return Inertia::render('backend/permission/permission/save', [
            'record' => $record,
        ]);
    }

    /**
     * Lưu quyền mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'permission:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'permission.index');
    }

    /**
     * Cập nhật quyền
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'permission:update');
        $response = $this->service->save($request, $id);
        return $this->handleAction($request, $response, redirectRoute: 'permission.index', editRoute: 'permission.edit');
    }

    /**
     * Xóa quyền
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'permission:delete');
        $response = $this->service->destroy($id);
        return to_route('permission.index');
    }

    /**
     * Xóa nhiều quyền cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'permission:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều quyền cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'permission:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

}