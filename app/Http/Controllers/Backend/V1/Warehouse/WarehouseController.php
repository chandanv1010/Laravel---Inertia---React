<?php   
namespace App\Http\Controllers\Backend\V1\Warehouse;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Warehouse\StoreWarehouseRequest as StoreRequest;
use App\Http\Requests\Warehouse\UpdateWarehouseRequest as UpdateRequest;
use App\Http\Requests\Warehouse\Warehouse\BulkDestroyRequest;
use App\Http\Requests\Warehouse\Warehouse\BulkUpdateRequest;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface as WarehouseService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Warehouse\WarehouseResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class WarehouseController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;

    public function __construct(
        WarehouseService $service,
        UserService $userService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách kho
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'warehouse:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        
        return Inertia::render('backend/warehouse/warehouse/index', [
            'records' => WarehouseResource::collection($records)->resource,
            'users' => $users,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới kho
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'warehouse:store');
        
        return Inertia::render('backend/warehouse/warehouse/save');
    }

    /**
     * Hiển thị chi tiết kho
     *
     * @param int $id
     * @return Response
     */
    public function show($id): Response {
        $this->authorize('modules', 'warehouse:index');
        $record = $this->service->show($id);
        
        return Inertia::render('backend/warehouse/warehouse/show', [
            'record' => new WarehouseResource($record)
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa kho
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'warehouse:update');
        $record = $this->service->show($id);
        
        return Inertia::render('backend/warehouse/warehouse/save', [
            'record' => new WarehouseResource($record)
        ]);
    }

    /**
     * Lưu kho mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'warehouse:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'warehouse.index');
    }

    /**
     * Cập nhật kho
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'warehouse:update');
        $response = $this->service->save($request, $id);
        
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'code', 'address', 'phone', 'email', 'manager', 'description']);
        
        if($onlyPublish){
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'warehouse.index', editRoute: 'warehouse.edit');
    }

    /**
     * Xóa kho
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'warehouse:delete');
        try {
            $response = $this->service->destroy($id);
            return to_route('warehouse.index')->with('success', Lang::get('messages.delete_success'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Xóa nhiều kho cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'warehouse:bulkDestroy');
        try {
            $response = $this->service->bulkDestroy($request);
            return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                             : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Cập nhật nhiều kho cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'warehouse:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }
}
