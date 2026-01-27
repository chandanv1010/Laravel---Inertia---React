<?php   
namespace App\Http\Controllers\Backend\V1\Product;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Product\ProductVariant\StoreRequest;
use App\Http\Requests\Product\ProductVariant\UpdateRequest;
use App\Http\Requests\Product\ProductVariant\BulkDestroyRequest;
use App\Http\Requests\Product\ProductVariant\BulkUpdateRequest;
use App\Services\Interfaces\Product\ProductVariantServiceInterface as ProductVariantService;
use App\Services\Interfaces\Product\ProductServiceInterface as ProductService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Product\ProductVariantResource;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\Product\ProductVariant\UpdateWarehouseStocksRequest;

class ProductVariantController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $productService;

    public function __construct(
        ProductVariantService $service,
        ProductService $productService
    )
    {
        $this->service = $service;
        $this->productService = $productService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách biến thể sản phẩm
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'product_variant:index');
        
        $records = $this->service->paginate($request);
        $products = $this->productService->paginate(new Request(['type' => 'all', 'sort' => 'id,desc']));
        
        return Inertia::render('backend/product/product_variant/index', [
            'records' => ProductVariantResource::collection($records)->resource,
            'products' => $products,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới biến thể sản phẩm
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'product_variant:store');
        $products = $this->productService->paginate(new Request(['type' => 'all', 'sort' => 'id,desc']));
        return Inertia::render('backend/product/product_variant/save', [
            'products' => $products
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa biến thể sản phẩm
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'product_variant:update');
        $record = $this->service->show($id);
        $products = $this->productService->paginate(new Request(['type' => 'all', 'sort' => 'id,desc']));
        return Inertia::render('backend/product/product_variant/save', [
            'record' => new ProductVariantResource($record),
            'products' => $products
        ]);
    }

    /**
     * Hiển thị trang chi tiết biến thể sản phẩm (lồng trong sản phẩm)
     *
     * @param int $productId
     * @param int $variantId
     * @return Response
     */
    public function show($productId, $variantId): Response {
        $this->authorize('modules', 'product_variant:update');
        
        $product = $this->productService->show($productId);
        if (!$product) {
            abort(404, 'Product not found');
        }
        
        $variant = $this->service->show($variantId);
        if (!$variant || $variant->product_id != $productId) {
            abort(404, 'Variant not found');
        }
        
        $warehouseService = app(\App\Services\Interfaces\Warehouse\WarehouseServiceInterface::class);
        $warehouses = $warehouseService->getDropdown();
        $taxSettingService = app(\App\Services\Interfaces\Setting\TaxSettingServiceInterface::class);
        $tax = $taxSettingService->get();
        
        return Inertia::render('backend/product/product_variant/detail', [
            'product' => new \App\Http\Resources\Product\ProductResource($product),
            'variant' => new ProductVariantResource($variant),
            'warehouses' => $warehouses,
            'tax' => $tax
        ]);
    }

    /**
     * Lưu biến thể sản phẩm mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'product_variant:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'product_variant.index');
    }

    /**
     * Cập nhật biến thể sản phẩm
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'product_variant:update');
        $response = $this->service->save($request, $id);
        
        // Nếu request từ trang variant detail, redirect về trang đó
        $variant = $this->service->show($id);
        if ($variant && $request->header('X-Inertia')) {
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'product_variant.index', editRoute: 'product_variant.edit');
    }

    /**
     * Xóa biến thể sản phẩm
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'product_variant:delete');
        $response = $this->service->destroy($id);
        return to_route('product_variant.index');
    }

    /**
     * Xóa nhiều biến thể sản phẩm cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'product_variant:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều biến thể sản phẩm cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'product_variant:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Cập nhật tồn kho theo kho cho biến thể sản phẩm
     *
     * @param UpdateWarehouseStocksRequest $request
     * @param int $variantId
     * @return JsonResponse
     */
    public function updateWarehouseStocks(UpdateWarehouseStocksRequest $request, $variantId): JsonResponse
    {
        $this->authorize('modules', 'product_variant:update');
        
        $result = $this->service->updateWarehouseStocks($request, $variantId);
        
        if ($result) {
            return response()->json(['success' => true, 'message' => 'Warehouse stocks updated successfully']);
        }
        
        return response()->json(['success' => false, 'message' => 'Failed to update warehouse stocks'], 500);
    }

}

