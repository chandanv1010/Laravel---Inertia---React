<?php   
namespace App\Http\Controllers\Backend\V1\Product;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Product\Product\StoreRequest;
use App\Http\Requests\Product\Product\UpdateRequest;
use App\Http\Requests\Product\Product\BulkDestroyRequest;
use App\Http\Requests\Product\Product\BulkUpdateRequest;
use App\Services\Interfaces\Product\ProductServiceInterface as ProductService;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface as ProductCatalogueService;
use App\Services\Interfaces\Product\ProductBrandServiceInterface as ProductBrandService;
use App\Services\Interfaces\Setting\LanguageServiceInterface as LanguageService;
use App\Services\Interfaces\Setting\TaxSettingServiceInterface as TaxSettingService;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface as WarehouseService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Product\ProductResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\Product\Product\UpdateWarehouseStocksRequest;

class ProductController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $productCatalogueService;
    private $productBrandService;
    private $languageService;
    private $taxSettingService;
    private $warehouseService;

    public function __construct(
        ProductService $service,
        UserService $userService,
        ProductCatalogueService $productCatalogueService,
        ProductBrandService $productBrandService,
        LanguageService $languageService,
        TaxSettingService $taxSettingService,
        WarehouseService $warehouseService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        $this->productCatalogueService = $productCatalogueService;
        $this->productBrandService = $productBrandService;
        $this->languageService = $languageService;
        $this->taxSettingService = $taxSettingService;
        $this->warehouseService = $warehouseService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách sản phẩm
     *
     * @param Request $request
     * @return Response|JsonResponse
     */
    public function index(Request $request): Response|JsonResponse{
        $this->authorize('modules', 'product:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $catalogues = $this->productCatalogueService->getNestedsetDropdown();
        $languages = $this->languageService->paginate(new Request(['type' => 'all', 'publish' => '2']));
        
        $requestData = $this->service->formatRequestDataForFrontend($request);
        
        if ($request->wantsJson()) {
            return response()->json([
                'data' => ProductResource::collection($records)->resource->items(),
            ]);
        }

        return Inertia::render('backend/product/product/index', [
            'records' => ProductResource::collection($records)->resource,
            'users' => $users,
            'catalogues' => $catalogues,
            'languages' => $languages,
            'request' => $requestData
        ]);
    }

    /**
     * Hiển thị form tạo mới sản phẩm
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'product:store');
        
        $catalogues = $this->productCatalogueService->getNestedsetDropdown();
        $brands = $this->productBrandService->getDropdown();
        $warehouses = $this->warehouseService->getDropdown();
        $tax = $this->taxSettingService->get();
        return Inertia::render('backend/product/product/save', [
            'catalogues' => $catalogues,
            'brands' => $brands,
            'warehouses' => $warehouses,
            'tax' => $tax
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa sản phẩm
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'product:update');
        $record = $this->service->show($id);

        $catalogues = $this->productCatalogueService->getNestedsetDropdown();
        $brands = $this->productBrandService->getDropdown();
        $warehouses = $this->warehouseService->getDropdown();
        $tax = $this->taxSettingService->get();
        
        $pendingIncomingStock = \App\Models\ImportOrderItem::query()
            ->where('product_id', $id)
            ->whereHas('importOrder', function ($query) {
                $query->where('status', 'pending');
            })
            ->with(['importOrder:id,code,supplier_id,expected_import_date,status,warehouse_id', 'importOrder.supplier:id,name'])
            ->get()
            ->map(function ($item) {
                return [
                    'import_order_id' => $item->import_order_id,
                    'import_order_code' => $item->importOrder->code ?? '',
                    'supplier_name' => $item->importOrder->supplier->name ?? 'N/A',
                    'expected_date' => $item->importOrder->expected_import_date,
                    'quantity' => (int) $item->quantity,
                    'status' => $item->importOrder->status ?? 'pending',
                    'warehouse_id' => $item->importOrder->warehouse_id ?? null,
                ];
            });
        
        return Inertia::render('backend/product/product/save', [
            'record' => new ProductResource($record),
            'catalogues' => $catalogues,
            'brands' => $brands,
            'warehouses' => $warehouses,
            'tax' => $tax,
            'pendingIncomingStock' => $pendingIncomingStock,
        ]);
    }

    /**
     * Lưu sản phẩm mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'product:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'product.index');
    }

    /**
     * Cập nhật sản phẩm
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'product:update');
        $response = $this->service->save($request, $id);
        
        $onlyOrder = $request->has('order') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'product_catalogue_id', 'product_catalogues', 'publish']);
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'product_catalogue_id', 'product_catalogues', 'order']);
        
        if($onlyOrder || $onlyPublish){
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'product.index', editRoute: 'product.edit');
    }

    /**
     * Tạo nhanh sản phẩm cho đơn nhập kho (trả về JSON)
     *
     * @param StoreRequest $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function quickAdd(StoreRequest $request): \Illuminate\Http\JsonResponse
    {
        $this->authorize('modules', 'product:store');
        
        try {
            $stockQuantity = $request->input('stock_quantity', 0);
            $warehouseId = $request->input('warehouse_id');
            
            if ($stockQuantity > 0 && !$request->has('warehouse_stocks')) {
                $warehouseService = app(\App\Services\Interfaces\Warehouse\WarehouseServiceInterface::class);
                $warehouses = $warehouseService->getDropdown();
                $firstWarehouseValue = !empty($warehouses) && isset($warehouses[0]) 
                    ? (is_array($warehouses[0]) ? ($warehouses[0]['value'] ?? null) : ($warehouses[0]->value ?? null))
                    : null;
                $defaultWarehouseId = $warehouseId ?: $firstWarehouseValue;
                
                if ($defaultWarehouseId) {
                    $request->merge([
                        'warehouse_stocks' => [[
                            'warehouse_id' => $defaultWarehouseId,
                            'stock_quantity' => $stockQuantity,
                            'storage_location' => null
                        ]]
                    ]);
                }
            }
            
            $response = $this->service->save($request);
            
            if ($response && $response->id) {
                $product = $this->service->show($response->id);
                return response()->json([
                    'success' => true,
                    'data' => new \App\Http\Resources\Product\ProductResource($product)
                ]);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create product'
            ], 500);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => ['submit' => $e->getMessage()]
            ], 422);
        }
    }

    /**
     * Xóa sản phẩm
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'product:delete');
        $response = $this->service->destroy($id);
        return to_route('product.index');
    }

    /**
     * Xóa nhiều sản phẩm cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'product:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều sản phẩm cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'product:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Cập nhật tồn kho theo kho
     *
     * @param UpdateWarehouseStocksRequest $request
     * @param int $id
     * @return JsonResponse
     */
    public function updateWarehouseStocks(UpdateWarehouseStocksRequest $request, $id): JsonResponse
    {
        $this->authorize('modules', 'product:update');
        
        $result = $this->service->updateWarehouseStocks($request, $id);
        
        if ($result) {
            return response()->json(['success' => true, 'message' => 'Warehouse stocks updated successfully']);
        }
        
        return response()->json(['success' => false, 'message' => 'Failed to update warehouse stocks'], 500);
    }

    /**
     * Chuyển tồn kho giữa các kho cho sản phẩm cơ bản
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function transferWarehouseStock(Request $request, $id): JsonResponse
    {
        $this->authorize('modules', 'product:update');
        
        $validated = $request->validate([
            'from_warehouse_id' => 'required|integer|exists:warehouses,id',
            'to_warehouse_id' => 'required|integer|exists:warehouses,id',
            'quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:255',
        ]);

        if ($validated['from_warehouse_id'] === $validated['to_warehouse_id']) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể chuyển đến cùng kho.',
            ], 422);
        }

        $result = $this->service->transferWarehouseStock(
            $id,
            (int) $validated['from_warehouse_id'],
            (int) $validated['to_warehouse_id'],
            (int) $validated['quantity'],
            $validated['reason'] ?? null
        );

        if ($result) {
            return response()->json([
                'success' => true,
                'message' => 'Chuyển kho thành công',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Chuyển kho thất bại',
        ], 500);
    }

    /**
     * Lấy lịch sử thay đổi tồn kho của sản phẩm
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function getStockHistory(Request $request, $id): JsonResponse
    {
        $this->authorize('modules', 'product:index');
        
        try {
            $product = $this->service->show($id);
            
            if (!$product) {
                return response()->json(['success' => false, 'message' => 'Product not found'], 404);
            }

            $query = \App\Models\ProductWarehouseStockLog::query()
                ->where('product_id', $product->id)
                ->with('user:id,name,email')
                ->with('warehouse:id,name,code')
                ->orderBy('created_at', 'desc');

            $transactionTypes = $request->input('transaction_types', []);
            if (is_array($transactionTypes) && count($transactionTypes) > 0) {
                $query->whereIn('transaction_type', $transactionTypes);
            }

            if ($request->has('warehouse_id')) {
                $warehouseId = $request->input('warehouse_id');
                if ($warehouseId) {
                    $query->where('warehouse_id', $warehouseId);
                }
            }

            if ($request->has('created_at.between')) {
                $dateRange = $request->input('created_at.between');
                if ($dateRange && is_string($dateRange)) {
                    $dates = explode(',', $dateRange);
                    if (count($dates) === 2) {
                        $startDate = trim($dates[0]);
                        $endDate = trim($dates[1]);
                        if ($startDate && $endDate) {
                            $query->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
                        }
                    }
                }
            }

            $perPage = $request->input('perpage', 20);
            $logs = $query->paginate($perPage);

            $data = $logs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'change_stock' => (int) $log->change_stock,
                    'before_stock' => (int) $log->before_stock,
                    'after_stock' => (int) $log->after_stock,
                    'reason' => $log->reason,
                    'transaction_type' => $log->transaction_type,
                    'warehouse_id' => $log->warehouse_id,
                    'warehouse_name' => $log->warehouse->name ?? null,
                    'warehouse_code' => $log->warehouse->code ?? null,
                    'created_at' => $log->created_at ? $log->created_at->format('Y-m-d H:i:s') : null,
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                    ] : null,
                ];
            })->values()->all();

            return response()->json([
                'success' => true,
                'data' => $data,
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Lấy thông tin tồn kho của sản phẩm (tồn kho theo kho và tồn kho theo lô)
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getStockInfo($id): JsonResponse
    {
        $this->authorize('modules', 'product:index');
        
        try {
            $product = $this->service->show($id);
            
            if (!$product) {
                return response()->json(['success' => false, 'message' => 'Product not found'], 404);
            }

            $warehouseStocks = \App\Models\ProductWarehouseStock::where('product_id', $product->id)
                ->with('warehouse:id,name')
                ->get()
                ->map(function ($stock) {
                    return [
                        'warehouse_id' => $stock->warehouse_id,
                        'warehouse_name' => $stock->warehouse->name ?? 'N/A',
                        'stock_quantity' => (int) $stock->stock_quantity,
                    ];
                });

            $batchStocks = [];
            if ($product->management_type === 'batch') {
                $batches = \App\Models\ProductBatch::where('product_id', $product->id)
                    ->whereNull('product_variant_id')
                    ->with(['warehouseStocks.warehouse:id,name'])
                    ->get();

                foreach ($batches as $batch) {
                    foreach ($batch->warehouseStocks as $batchStock) {
                        if ($batchStock->stock_quantity > 0) {
                            $batchStocks[] = [
                                'batch_id' => $batch->id,
                                'batch_code' => $batch->code,
                                'warehouse_id' => $batchStock->warehouse_id,
                                'warehouse_name' => $batchStock->warehouse->name ?? 'N/A',
                                'stock_quantity' => (int) $batchStock->stock_quantity,
                            ];
                        }
                    }
                }
            }

            $totalStock = $warehouseStocks->sum('stock_quantity');

            return response()->json([
                'success' => true,
                'data' => [
                    'warehouse_stocks' => $warehouseStocks,
                    'batch_stocks' => $batchStocks,
                    'total_stock' => $totalStock,
                    'management_type' => $product->management_type,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Lấy thông tin tồn kho của biến thể sản phẩm
     *
     * @param int $productId
     * @param int $variantId
     * @return JsonResponse
     */
    public function getVariantStockInfo($productId, $variantId): JsonResponse
    {
        $this->authorize('modules', 'product:index');
        
        try {
            $variant = \App\Models\ProductVariant::find($variantId);
            
            if (!$variant || $variant->product_id != $productId) {
                return response()->json(['success' => false, 'message' => 'Variant not found'], 404);
            }

            $warehouseStocks = \App\Models\ProductVariantWarehouseStock::where('product_variant_id', $variantId)
                ->with('warehouse:id,name')
                ->get()
                ->map(function ($stock) {
                    return [
                        'warehouse_id' => $stock->warehouse_id,
                        'warehouse_name' => $stock->warehouse->name ?? 'N/A',
                        'stock_quantity' => (int) $stock->stock_quantity,
                    ];
                });

            $batchStocks = [];
            $product = $variant->product;
            if ($product && $product->management_type === 'batch') {
                $batches = \App\Models\ProductBatch::where('product_variant_id', $variantId)
                    ->with(['warehouseStocks.warehouse:id,name'])
                    ->get();

                foreach ($batches as $batch) {
                    foreach ($batch->warehouseStocks as $batchStock) {
                        if ($batchStock->stock_quantity > 0) {
                            $batchStocks[] = [
                                'batch_id' => $batch->id,
                                'batch_code' => $batch->code,
                                'warehouse_id' => $batchStock->warehouse_id,
                                'warehouse_name' => $batchStock->warehouse->name ?? 'N/A',
                                'stock_quantity' => (int) $batchStock->stock_quantity,
                            ];
                        }
                    }
                }
            }

            $totalStock = $warehouseStocks->sum('stock_quantity');

            return response()->json([
                'success' => true,
                'data' => [
                    'warehouse_stocks' => $warehouseStocks,
                    'batch_stocks' => $batchStocks,
                    'total_stock' => $totalStock,
                    'management_type' => $product->management_type ?? 'basic',
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }


}

