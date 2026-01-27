<?php   
namespace App\Http\Controllers\Backend\V1\Warehouse;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Warehouse\StoreImportOrderRequest as StoreRequest;
use App\Http\Requests\Warehouse\UpdateImportOrderRequest as UpdateRequest;
use App\Http\Requests\Warehouse\ImportOrder\BulkDestroyRequest;
use App\Http\Requests\Warehouse\ImportOrder\BulkUpdateRequest;
use App\Services\Interfaces\Warehouse\ImportOrderServiceInterface as ImportOrderService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Warehouse\ImportOrderResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use App\Services\Interfaces\Warehouse\SupplierServiceInterface as SupplierService;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface as WarehouseService;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface as ProductCatalogueService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Auth;

class ImportOrderController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $supplierService;
    private $warehouseService;
    private $productCatalogueService;

    public function __construct(
        ImportOrderService $service,
        UserService $userService,
        SupplierService $supplierService,
        WarehouseService $warehouseService,
        ProductCatalogueService $productCatalogueService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        $this->supplierService = $supplierService;
        $this->warehouseService = $warehouseService;
        $this->productCatalogueService = $productCatalogueService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách đơn nhập kho
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'import_order:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        
        return Inertia::render('backend/warehouse/import_order/index', [
            'records' => ImportOrderResource::collection($records)->resource,
            'users' => $users,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới đơn nhập kho
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'import_order:store');
        
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $suppliers = $this->supplierService->getDropdown();
        $warehouses = $this->warehouseService->getDropdown();
        $catalogues = $this->productCatalogueService->getDropdown();
        
        return Inertia::render('backend/warehouse/import_order/save', [
            'users' => $users,
            'suppliers' => $suppliers,
            'warehouses' => $warehouses,
            'catalogues' => $catalogues,
        ]);
    }

    /**
     * Hiển thị chi tiết đơn nhập kho
     *
     * @param int $import_order
     * @return Response
     */
    public function show($import_order): Response {
        $this->authorize('modules', 'import_order:index');
        $record = $this->service->show($import_order);
        
        $record->load(['history' => function($query) {
            $query->with('user')->orderBy('created_at', 'desc');
        }]);
        
        return Inertia::render('backend/warehouse/import_order/show', [
            'record' => new ImportOrderResource($record)
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa đơn nhập kho
     *
     * @param int $import_order
     * @return Response
     */
    public function edit($import_order): Response {
        $this->authorize('modules', 'import_order:update');
        $record = $this->service->show($import_order);
        
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $suppliers = $this->supplierService->getDropdown();
        $warehouses = $this->warehouseService->getDropdown();
        $catalogues = $this->productCatalogueService->getDropdown();
        
        return Inertia::render('backend/warehouse/import_order/save', [
            'record' => new ImportOrderResource($record),
            'users' => $users,
            'suppliers' => $suppliers,
            'warehouses' => $warehouses,
            'catalogues' => $catalogues,
        ]);
    }

    /**
     * Lưu đơn nhập kho mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'import_order:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'import_order.index');
    }

    /**
     * Cập nhật đơn nhập kho
     *
     * @param UpdateRequest $request
     * @param int $import_order
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $import_order): RedirectResponse {
        $this->authorize('modules', 'import_order:update');
        $response = $this->service->save($request, $import_order);
        
        $onlyStatus = $request->has('status') && !$request->hasAny(['code', 'supplier_id', 'warehouse_id', 'responsible_user_id', 'expected_import_date', 'reference', 'notes', 'tags', 'total_amount', 'discount', 'import_cost', 'amount_to_pay', 'items', 'payment_status', 'payment_date']);
        
        $onlyPaymentStatus = $request->has('payment_status') && !$request->hasAny(['code', 'supplier_id', 'warehouse_id', 'responsible_user_id', 'expected_import_date', 'reference', 'notes', 'tags', 'total_amount', 'discount', 'import_cost', 'amount_to_pay', 'items', 'status']);
        
        if($onlyStatus || $onlyPaymentStatus){
            $referer = $request->header('Referer');
            if($referer && str_contains($referer, '/import-order/') && str_contains($referer, '/edit') === false){
                return redirect("/backend/import-order/{$import_order}")->with('success', Lang::get('messages.save_success'));
            }
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'import_order.index', editRoute: 'import_order.edit');
    }

    /**
     * Xóa đơn nhập kho
     *
     * @param int $import_order
     * @return RedirectResponse
     */
    public function destroy($import_order){
        $this->authorize('modules', 'import_order:delete');
        try {
            $response = $this->service->destroy($import_order);
            return to_route('import_order.index')->with('success', Lang::get('messages.delete_success'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Hủy đơn nhập kho (đặt trạng thái thành cancelled)
     *
     * @param Request $request
     * @param int $import_order
     * @return RedirectResponse
     */
    public function cancel(Request $request, $import_order): RedirectResponse {
        $this->authorize('modules', 'import_order:update');
        try {
            $response = $this->service->cancel($import_order);
            return redirect()->back()->with('success', 'Hủy đơn thành công!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Khôi phục đơn nhập kho đã hủy
     *
     * @param Request $request
     * @param int $import_order
     * @return RedirectResponse
     */
    public function restore(Request $request, $import_order): RedirectResponse {
        $this->authorize('modules', 'import_order:update');
        try {
            $response = $this->service->restore($import_order);
            return redirect()->back()->with('success', 'Khôi phục đơn thành công!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Xóa nhiều đơn nhập kho cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'import_order:bulkDestroy');
        try {
            $response = $this->service->bulkDestroy($request);
            return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                             : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Cập nhật nhiều đơn nhập kho cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'import_order:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Nhập hàng vào kho từ đơn nhập
     *
     * @param Request $request
     * @param int $id
     * @return RedirectResponse
     */
    public function importToStock(Request $request, $id): RedirectResponse {
        $this->authorize('modules', 'import_order:update');
        try {
            $response = $this->service->importToStock($id);
            return redirect("/backend/import-order/{$id}")->with('success', 'Nhập kho thành công!');
        } catch (\Exception $e) {
            if (str_contains($e->getMessage(), 'Số lượng lô không khớp')) {
                return redirect()->back()
                    ->with('error', $e->getMessage())
                    ->with('show_batch_error', true);
            }
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Xử lý thanh toán cho đơn nhập kho
     *
     * @param Request $request
     * @param int $id
     * @return RedirectResponse
     */
    public function payment(Request $request, $id): RedirectResponse {
        $this->authorize('modules', 'import_order:update');
        
        $request->validate([
            'amount' => 'required|numeric|min:0',
            'note' => 'nullable|string|max:500',
        ]);
        
        try {
            $order = \App\Models\ImportOrder::findOrFail($id);
            
            $paymentAmount = floatval($request->amount);
            $currentPaid = floatval($order->payment_amount ?? 0);
            $amountToPay = floatval($order->amount_to_pay);
            
            $totalPaid = $currentPaid + $paymentAmount;
            
            $order->payment_amount = $totalPaid;
            
            if ($totalPaid >= $amountToPay) {
                $order->payment_status = 'paid';
                $order->payment_date = now();
            } elseif ($totalPaid > 0) {
                $order->payment_status = 'partial';
            }
            
            $order->save();
            
            $order->history()->create([
                'user_id' => Auth::id(),
                'action' => 'payment',
                'data' => [
                    'amount' => $paymentAmount,
                    'note' => $request->note ?? '',
                    'total_paid' => $totalPaid,
                    'remaining' => max(0, $amountToPay - $totalPaid),
                ],
            ]);
            
            return redirect()->back()->with('success', 'Thanh toán thành công!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }
}
