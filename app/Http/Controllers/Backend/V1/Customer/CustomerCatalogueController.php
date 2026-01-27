<?php   
namespace App\Http\Controllers\Backend\V1\Customer;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Customer\CustomerCatalogue\StoreRequest;
use App\Http\Requests\Customer\CustomerCatalogue\UpdateRequest;
use App\Http\Requests\Customer\CustomerCatalogue\BulkDestroyRequest;
use App\Http\Requests\Customer\CustomerCatalogue\BulkUpdateRequest;
use App\Services\Interfaces\Customer\CustomerCatalogueServiceInterface as CustomerCatalogueService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Customer\CustomerCatalogueResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Log;

class CustomerCatalogueController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;

    public function __construct(
        CustomerCatalogueService $service,
        UserService $userService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách nhóm khách hàng
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'customer_catalogue:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        
        return Inertia::render('backend/customer/customer_catalogue/index', [
            'records' => CustomerCatalogueResource::collection($records)->resource,
            'users' => $users,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới nhóm khách hàng
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'customer_catalogue:store');
        
        return Inertia::render('backend/customer/customer_catalogue/save');
    }

    /**
     * Hiển thị form chỉnh sửa nhóm khách hàng
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'customer_catalogue:update');
        $record = $this->service->show($id);
        
        return Inertia::render('backend/customer/customer_catalogue/save', [
            'record' => new CustomerCatalogueResource($record)
        ]);
    }

    /**
     * Lưu nhóm khách hàng mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'customer_catalogue:store');
        try {
            $response = $this->service->save($request);
            if (!$response) {
                Log::error('CustomerCatalogue store failed', [
                    'request_data' => $request->all(),
                    'errors' => $request->errors()
                ]);
            }
            return $this->handleAction($request, $response, redirectRoute: 'customer_catalogue.index');
        } catch (\Exception $e) {
            Log::error('CustomerCatalogue store exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Cập nhật nhóm khách hàng
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'customer_catalogue:update');
        $response = $this->service->save($request, $id);
        
        $onlyOrder = $request->has('order') && !$request->hasAny(['name', 'description', 'publish']);
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'description', 'order']);
        
        if($onlyOrder || $onlyPublish){
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'customer_catalogue.index', editRoute: 'customer_catalogue.edit');
    }

    /**
     * Xóa nhóm khách hàng
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'customer_catalogue:delete');
        $response = $this->service->destroy($id);
        return to_route('customer_catalogue.index');
    }

    /**
     * Xóa nhiều nhóm khách hàng cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'customer_catalogue:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều nhóm khách hàng cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'customer_catalogue:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }
}
