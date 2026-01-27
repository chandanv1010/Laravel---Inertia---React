<?php   
namespace App\Http\Controllers\Backend\V1\User;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\User\User\StoreRequest;
use App\Http\Requests\User\User\UpdateRequest;
use App\Http\Requests\User\User\BulkDestroyRequest;
use App\Http\Requests\User\User\BulkUpdateRequest;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use App\Services\Interfaces\User\UserCatalogueServiceInterface as UserCatalogueService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class UserController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $userCatalogueService;

    public function __construct(
        UserService $service,
        UserService $userService,
        UserCatalogueService $userCatalogueService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        $this->userCatalogueService = $userCatalogueService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách người dùng
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'user:index');
        
        $records = $this->service->paginate($request);
        $userCatalogues = $this->getUserCatalogues();
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        return Inertia::render('backend/user/user/index', [
            'records' => $records,
            'users' => $users,
            'userCatalogues' => $userCatalogues,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới người dùng
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'user:store');
        
        $userCatalogues = $this->getUserCatalogues();
        return Inertia::render('backend/user/user/save', [
            'userCatalogues' => $userCatalogues
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa người dùng
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'user:update');
        $userCatalogues = $this->getUserCatalogues();
        $record = $this->service->show($id);
        
        return Inertia::render('backend/user/user/save', [
            'record' => $record,
            'userCatalogues' => $userCatalogues
        ]);
    }

    /**
     * Lưu người dùng mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'user:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'user.index');
    }

    /**
     * Cập nhật người dùng
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'user:update');
        $response = $this->service->save($request, $id);
        return $this->handleAction($request, $response, redirectRoute: 'user.index', editRoute: 'user.edit');
    }

    /**
     * Xóa người dùng
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'user:delete');
        $response = $this->service->destroy($id);
        return to_route('user.index');
    }

    /**
     * Xóa nhiều người dùng cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'user:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều người dùng cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'user:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Lấy danh sách nhóm người dùng
     *
     * @return mixed
     */
    private function getUserCatalogues(){
        return $this->userCatalogueService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
    }

}