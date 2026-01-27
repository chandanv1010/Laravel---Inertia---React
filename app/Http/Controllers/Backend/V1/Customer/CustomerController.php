<?php   
namespace App\Http\Controllers\Backend\V1\Customer;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Customer\Customer\StoreRequest;
use App\Http\Requests\Customer\Customer\UpdateRequest;
use App\Http\Requests\Customer\Customer\BulkDestroyRequest;
use App\Http\Requests\Customer\Customer\BulkUpdateRequest;
use App\Services\Interfaces\Customer\CustomerServiceInterface as CustomerService;
use App\Services\Interfaces\Customer\CustomerCatalogueServiceInterface as CustomerCatalogueService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Customer\CustomerResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Log;

class CustomerController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $customerCatalogueService;

    public function __construct(
        CustomerService $service,
        UserService $userService,
        CustomerCatalogueService $customerCatalogueService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        $this->customerCatalogueService = $customerCatalogueService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách khách hàng
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'customer:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $catalogues = $this->customerCatalogueService->getDropdown();
        
        return Inertia::render('backend/customer/customer/index', [
            'records' => CustomerResource::collection($records)->resource,
            'users' => $users,
            'catalogues' => $catalogues,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới khách hàng
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'customer:store');
        
        $catalogues = $this->customerCatalogueService->getDropdown();
        return Inertia::render('backend/customer/customer/save', [
            'catalogues' => $catalogues
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa khách hàng
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'customer:update');
        $record = $this->service->show($id);
        
        $catalogues = $this->customerCatalogueService->getDropdown();
        return Inertia::render('backend/customer/customer/save', [
            'record' => new CustomerResource($record),
            'catalogues' => $catalogues
        ]);
    }

    /**
     * Lưu khách hàng mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'customer:store');
        try {
            $response = $this->service->save($request);
            if (!$response) {
                Log::error('Customer store failed', [
                    'request_data' => $request->all(),
                    'errors' => $request->errors()
                ]);
            }
            return $this->handleAction($request, $response, redirectRoute: 'customer.index');
        } catch (\Exception $e) {
            Log::error('Customer store exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Cập nhật khách hàng
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'customer:update');
        $response = $this->service->save($request, $id);
        
        $onlyPublish = $request->has('publish') && !$request->hasAny(['last_name', 'first_name', 'email', 'phone', 'date_of_birth', 'gender', 'customer_catalogue_id', 'notes']);
        
        if($onlyPublish){
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'customer.index', editRoute: 'customer.edit');
    }

    /**
     * Xóa khách hàng
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'customer:delete');
        $response = $this->service->destroy($id);
        return to_route('customer.index');
    }

    /**
     * Xóa nhiều khách hàng cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'customer:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều khách hàng cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'customer:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }
}
