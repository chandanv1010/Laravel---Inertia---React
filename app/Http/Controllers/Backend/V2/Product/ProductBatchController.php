<?php   
namespace App\Http\Controllers\Backend\V2\Product;

use App\Http\Controllers\Backend\BaseController;
use App\Services\Interfaces\Product\ProductBatchServiceInterface as ProductBatchService;
use App\Http\Requests\Product\ProductBatch\StoreBatchesRequest;
use App\Http\Requests\Product\ProductBatch\UpdateBatchRequest;
use App\Http\Requests\Product\ProductBatch\TransferStockRequest;
use App\Http\Resources\Product\ProductBatchResource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductBatch;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ProductBatchController extends BaseController {

    use AuthorizesRequests;

    protected $service;

    public function __construct(
        ProductBatchService $service
    )
    {
        $this->service = $service;
        parent::__construct($service);
    }

    /**
     * Get batches for a product
     */
    public function index(Product $product): JsonResponse
    {
        $this->authorize('modules', 'product_batch:index');
        
        $items = $this->service->getBatchesForProduct($product->id);
        
        return response()->json(['data' => $items]);
    }

    /**
     * Get batches for a variant
     */
    public function indexVariant(ProductVariant $variant): JsonResponse
    {
        $this->authorize('modules', 'product_batch:index');
        
        $items = $this->service->getBatchesForVariant($variant->id);
        
        return response()->json(['data' => $items]);
    }

    /**
     * Ensure default batch exists for a product
     */
    public function ensureDefault(Product $product): JsonResponse
    {
        $this->authorize('modules', 'product_batch:store');
        
        $result = $this->service->ensureDefaultBatchForProduct($product->id);
        
        return response()->json(['data' => $result]);
    }

    /**
     * Ensure default batch exists for a variant
     */
    public function ensureDefaultVariant(ProductVariant $variant): JsonResponse
    {
        $this->authorize('modules', 'product_batch:store');
        
        $result = $this->service->ensureDefaultBatchForVariant($variant->id);
        
        return response()->json(['data' => $result]);
    }

    /**
     * Store batches for a product
     */
    public function store(StoreBatchesRequest $request, Product $product): JsonResponse
    {
        $this->authorize('modules', 'product_batch:store');
        
        $result = $this->service->storeBatchesForProduct($request, $product->id);
        
        return response()->json(['success' => $result]);
    }

    /**
     * Store batches for a variant
     */
    public function storeVariant(StoreBatchesRequest $request, ProductVariant $variant): JsonResponse
    {
        $this->authorize('modules', 'product_batch:store');
        
        $result = $this->service->storeBatchesForVariant($request, $variant->id);
        
        return response()->json(['success' => $result]);
    }

    /**
     * Update batch
     */
    public function update(UpdateBatchRequest $request, ProductBatch $batch): JsonResponse
    {
        $this->authorize('modules', 'product_batch:update');
        
        $result = $this->service->updateBatchStock($request, $batch->id);
        
        return response()->json(['success' => $result]);
    }

    /**
     * Get batch detail
     */
    public function detail(Request $request, ProductBatch $batch): Response
    {
        $this->authorize('modules', 'product_batch:index');
        
        $data = $this->service->getBatchDetail($batch->id, $request);
        
        return Inertia::render('backend/product/batch/show', $data);
    }

    /**
     * Transfer stock between warehouses
     */
    public function transfer(TransferStockRequest $request, ProductBatch $batch): JsonResponse
    {
        $this->authorize('modules', 'product_batch:update');
        
        $result = $this->service->transferStock($request, $batch->id);
        
        if (!$result['success']) {
            return response()->json($result, 422);
        }
        
        return response()->json($result);
    }

    /**
     * Delete batch
     */
    public function destroy(ProductBatch $batch): JsonResponse
    {
        $this->authorize('modules', 'product_batch:delete');
        
        if ($batch->is_default) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xoá lô mặc định.',
            ], 422);
        }

        $productId = $batch->product_id;
        $variantId = $batch->product_variant_id;
        
        $batch->delete();

        $this->service->clearCache($productId, $variantId);

        return response()->json(['success' => true]);
    }
}

