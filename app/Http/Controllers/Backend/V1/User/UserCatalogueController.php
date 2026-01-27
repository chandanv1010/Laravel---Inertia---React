<?php   
namespace App\Http\Controllers\Backend\V1\User;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\User\UserCatalogue\StoreRequest;
use App\Http\Requests\User\UserCatalogue\UpdateRequest;
use App\Http\Requests\User\UserCatalogue\BulkDestroyRequest;
use App\Http\Requests\User\UserCatalogue\BulkUpdateRequest;
use App\Services\Interfaces\User\UserCatalogueServiceInterface as UserCatalogueService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\User\UserCatalogueResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use App\Services\Interfaces\Permission\PermissionServiceInterface as PermissionService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class UserCatalogueController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $permissionService;

    public function __construct(
        UserCatalogueService $service,
        UserService $userService,
        PermissionService $permissionService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        $this->permissionService = $permissionService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách nhóm người dùng
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'user_catalogue:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request()->merge(['type' => 'all', 'sort' => 'name,asc']));
        return Inertia::render('backend/user/user_catalogue/index', [
            'records' => $records,
            'users' => $users,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới nhóm người dùng
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'user_catalogue:store');
        
        $permissions = $this->permissionService->paginate(new Request(['type' => 'all', 'sort' => 'canonical,asc']));
        return Inertia::render('backend/user/user_catalogue/save', [
            'permissions' => $permissions
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa nhóm người dùng
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'user_catalogue:update');
        $record = $this->service->show($id);
        
        $permissions = $this->permissionService->paginate(new Request(['type' => 'all', 'sort' => 'canonical,asc']));
        return Inertia::render('backend/user/user_catalogue/save', [
            'record' => $record,
            'permissions' => $permissions
        ]);
    }

    /**
     * Lưu nhóm người dùng mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'user_catalogue:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'user_catalogue.index');
    }

    /**
     * Cập nhật nhóm người dùng
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'user_catalogue:update');
        $response = $this->service->save($request, $id);
        return $this->handleAction($request, $response, redirectRoute: 'user_catalogue.index', editRoute: 'user_catalogue.edit');
    }

    /**
     * Xóa nhóm người dùng
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'user_catalogue:delete');
        $response = $this->service->destroy($id);
        return to_route('user_catalogue.index');
    }

    /**
     * Xóa nhiều nhóm người dùng cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'user_catalogue:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều nhóm người dùng cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'user_catalogue:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

}