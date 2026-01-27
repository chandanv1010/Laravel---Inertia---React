<?php   
namespace App\Http\Controllers\Backend\V1\Warehouse;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Warehouse\StoreSupplierRequest as StoreRequest;
use App\Http\Requests\Warehouse\UpdateSupplierRequest as UpdateRequest;
use App\Http\Requests\Warehouse\Supplier\BulkDestroyRequest;
use App\Http\Requests\Warehouse\Supplier\BulkUpdateRequest;
use App\Services\Interfaces\Warehouse\SupplierServiceInterface as SupplierService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Warehouse\SupplierResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class SupplierController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;

    public function __construct(
        SupplierService $service,
        UserService $userService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        parent::__construct($service);
    }

    public function index(Request $request): Response{
        $this->authorize('modules', 'supplier:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        
        return Inertia::render('backend/warehouse/supplier/index', [
            'records' => SupplierResource::collection($records)->resource,
            'users' => $users,
            'request' => $request->all()
        ]);
    }

    public function create(): Response {
        $this->authorize('modules', 'supplier:store');
        
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        
        return Inertia::render('backend/warehouse/supplier/save', [
            'users' => $users,
        ]);
    }

    public function show($id): Response {
        $this->authorize('modules', 'supplier:index');
        $record = $this->service->show($id);
        
        return Inertia::render('backend/warehouse/supplier/show', [
            'record' => new SupplierResource($record)
        ]);
    }

    public function info($id, Request $request): Response {
        $this->authorize('modules', 'supplier:index');
        $info = $this->service->getSupplierInfo($id, $request);
        
        return Inertia::render('backend/warehouse/supplier/info', [
            'supplier' => new SupplierResource($info['supplier']),
            'totalDebt' => $info['totalDebt'],
            'totalPaid' => $info['totalPaid'],
            'currentDebt' => $info['currentDebt'],
            'importHistory' => $info['importHistory'],
            'stats' => $info['stats'],
            'unpaidOrders' => $info['unpaidOrders'],
            'paymentHistory' => $info['paymentHistory'],
            'refundHistory' => $info['refundHistory'],
            'users' => $info['users'],
            'dateFrom' => $info['dateFrom'],
            'dateTo' => $info['dateTo'],
        ]);
    }

    public function edit($id): Response {
        $this->authorize('modules', 'supplier:update');
        $record = $this->service->show($id);
        
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        
        return Inertia::render('backend/warehouse/supplier/save', [
            'record' => new SupplierResource($record),
            'users' => $users,
        ]);
    }

    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'supplier:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'supplier.index');
    }

    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'supplier:update');
        $response = $this->service->save($request, $id);
        
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'code', 'email', 'website', 'phone', 'tax_code', 'fax', 'address', 'responsible_user_id']);
        
        if($onlyPublish){
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'supplier.index', editRoute: 'supplier.edit');
    }

    public function destroy($id){
        $this->authorize('modules', 'supplier:delete');
        try {
            $response = $this->service->destroy($id);
            return to_route('supplier.index')->with('success', Lang::get('messages.delete_success'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'supplier:bulkDestroy');
        try {
            $response = $this->service->bulkDestroy($request);
            return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                             : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'supplier:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }
}
