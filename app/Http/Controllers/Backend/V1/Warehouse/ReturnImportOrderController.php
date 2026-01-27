<?php

namespace App\Http\Controllers\Backend\V1\Warehouse;

use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\Interfaces\Warehouse\ReturnImportOrderServiceInterface as ReturnImportOrderService;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use App\Services\Interfaces\Warehouse\SupplierServiceInterface as SupplierService;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface as WarehouseService;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface as ProductCatalogueService;
use App\Http\Resources\Warehouse\ReturnImportOrderResource;
use App\Http\Resources\Warehouse\ImportOrderResource;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Lang;

class ReturnImportOrderController extends BaseController
{
    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $supplierService;
    private $warehouseService;
    private $productCatalogueService;

    public function __construct(
        ReturnImportOrderService $service,
        UserService $userService,
        SupplierService $supplierService,
        WarehouseService $warehouseService,
        ProductCatalogueService $productCatalogueService
    ) {
        $this->service = $service;
        $this->userService = $userService;
        $this->supplierService = $supplierService;
        $this->warehouseService = $warehouseService;
        $this->productCatalogueService = $productCatalogueService;
        parent::__construct($service);
    }

    /**
     * Danh sách đơn trả hàng
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'import_order:index');

        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $suppliers = $this->supplierService->getDropdown();
        $warehouses = $this->warehouseService->getDropdown();

        return Inertia::render('backend/warehouse/return_import_order/index', [
            'records' => ReturnImportOrderResource::collection($records)->resource,
            'users' => $users,
            'suppliers' => $suppliers,
            'warehouses' => $warehouses,
            'request' => $request->all()
        ]);
    }

    /**
     * Form tạo đơn trả hàng
     */
    public function create(Request $request): Response
    {
        $this->authorize('modules', 'import_order:store');

        $type = $request->get('type', 'by_order'); // by_order hoặc without_order
        $importOrderId = $request->get('import_order_id');

        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $suppliers = $this->supplierService->getDropdown();
        $warehouses = $this->warehouseService->getDropdown();
        $catalogues = $this->productCatalogueService->getDropdown();

        $importOrder = null;
        if ($importOrderId) {
            $importOrderData = $this->service->getImportOrderDetails($importOrderId);
            if ($importOrderData) {
                $importOrder = new ImportOrderResource($importOrderData);
            }
        }

        return Inertia::render('backend/warehouse/return_import_order/save', [
            'users' => $users,
            'suppliers' => $suppliers,
            'warehouses' => $warehouses,
            'catalogues' => $catalogues,
            'type' => $type,
            'importOrder' => $importOrder,
        ]);
    }

    /**
     * Lấy danh sách đơn nhập đã hoàn thành để chọn trả hàng
     */
    public function getImportOrdersForReturn(Request $request): JsonResponse
    {
        $this->authorize('modules', 'import_order:index');

        $filters = [
            'search' => $request->get('search'),
            'supplier_id' => $request->get('supplier_id'),
            'warehouse_id' => $request->get('warehouse_id'),
            'perPage' => $request->get('perPage', 10),
        ];

        $orders = $this->service->getCompletedImportOrders($filters);

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * Lấy chi tiết đơn nhập để trả hàng
     */
    public function getImportOrderDetails(int $id): JsonResponse
    {
        $this->authorize('modules', 'import_order:index');

        $order = $this->service->getImportOrderDetails($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Đơn nhập hàng không tồn tại!',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    /**
     * Trả hàng theo đơn nhập
     */
    public function returnByOrder(Request $request, int $importOrderId): JsonResponse
    {
        $this->authorize('modules', 'import_order:store');

        try {
            $data = $request->all();
            $result = $this->service->returnByOrder($importOrderId, $data);

            return response()->json([
                'success' => true,
                'message' => 'Tạo đơn trả hàng thành công!',
                'data' => new ReturnImportOrderResource($result),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Trả hàng không theo đơn
     */
    public function returnWithoutOrder(Request $request): JsonResponse
    {
        $this->authorize('modules', 'import_order:store');

        try {
            $data = $request->all();
            $result = $this->service->returnWithoutOrder($data);

            return response()->json([
                'success' => true,
                'message' => 'Tạo đơn trả hàng thành công!',
                'data' => new ReturnImportOrderResource($result),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Xuất kho đơn trả hàng (cho đơn pending)
     */
    public function exportToStock(int $id): JsonResponse
    {
        $this->authorize('modules', 'import_order:update');

        try {
            $result = $this->service->exportToStock($id);

            return response()->json([
                'success' => true,
                'message' => 'Xuất kho thành công!',
                'data' => new ReturnImportOrderResource($result),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Xác nhận đã nhận hoàn tiền từ NCC
     */
    public function confirmRefund(int $id): JsonResponse
    {
        $this->authorize('modules', 'import_order:update');

        try {
            $result = $this->service->confirmRefund($id);

            return response()->json([
                'success' => true,
                'message' => 'Xác nhận hoàn tiền thành công!',
                'data' => new ReturnImportOrderResource($result),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Xem chi tiết đơn trả hàng
     */
    public function show(int $id): Response
    {
        $this->authorize('modules', 'import_order:index');
        
        $record = $this->service->show($id);
        
        return Inertia::render('backend/warehouse/return_import_order/show', [
            'record' => new ReturnImportOrderResource($record),
        ]);
    }

    /**
     * Form sửa đơn trả hàng
     */
    public function edit(int $id): Response
    {
        $this->authorize('modules', 'import_order:update');
        
        $record = $this->service->show($id);
        
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $suppliers = $this->supplierService->getDropdown();
        $warehouses = $this->warehouseService->getDropdown();
        $catalogues = $this->productCatalogueService->getDropdown();
        
        $importOrder = null;
        if ($record->import_order_id) {
            $importOrderData = $this->service->getImportOrderDetails($record->import_order_id);
            if ($importOrderData) {
                $importOrder = new ImportOrderResource($importOrderData);
            }
        }
        
        return Inertia::render('backend/warehouse/return_import_order/save', [
            'record' => new ReturnImportOrderResource($record),
            'users' => $users,
            'suppliers' => $suppliers,
            'warehouses' => $warehouses,
            'catalogues' => $catalogues,
            'type' => $record->return_type ?? 'by_order',
            'importOrder' => $importOrder,
        ]);
    }

    /**
     * Xóa đơn trả hàng
     */
    public function destroy(int $id)
    {
        $this->authorize('modules', 'import_order:delete');
        
        $this->service->destroy($id);
        
        return redirect()->route('return_import_order.index')
            ->with('success', Lang::get('messages.delete_success'));
    }
}
