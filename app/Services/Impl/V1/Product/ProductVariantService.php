<?php  
namespace App\Services\Impl\V1\Product;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use App\Repositories\Product\ProductVariantRepo;
use App\Repositories\Product\ProductVariantWarehouseStockRepo;
use App\Repositories\Product\ProductVariantWarehouseStockLogRepo;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductVariantService extends BaseCacheService implements ProductVariantServiceInterface {

    // Cache strategy: 'dataset' phù hợp cho variants
    protected string $cacheStrategy = 'dataset';
    protected string $module = 'product_variants';

    protected $repository;
    protected $variantWarehouseStockRepo;
    protected $variantWarehouseStockLogRepo;
    protected $warehouseService;
    protected $oldManagementType = null; // Lưu management_type cũ trước khi update
    protected $oldStockQuantity = null; // Lưu stock_quantity cũ trước khi update
    protected $oldWarehouseStocks = []; // Lưu warehouse_stocks cũ từ batches

    protected $with = ['product', 'attributes', 'warehouseStocks'];
    protected $simpleFilter = ['publish', 'product_id', 'is_default'];
    protected $searchFields = ['sku'];
    protected $isMultipleLanguage = false;
    protected $sort = ['order', 'asc'];

    public function __construct(
        ProductVariantRepo $repository,
        ProductVariantWarehouseStockRepo $variantWarehouseStockRepo,
        ProductVariantWarehouseStockLogRepo $variantWarehouseStockLogRepo,
        WarehouseServiceInterface $warehouseService
    )
    {
        $this->repository = $repository;
        $this->variantWarehouseStockRepo = $variantWarehouseStockRepo;
        $this->variantWarehouseStockLogRepo = $variantWarehouseStockLogRepo;
        $this->warehouseService = $warehouseService;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        
        // Xử lý is_default: nếu set true, phải set các variant khác thành false
        if($this->request->has('is_default') && $this->request->input('is_default') === true){
            $productId = $this->request->input('product_id') ?? ($this->model ? $this->model->product_id : null);
            if($productId){
                // Set tất cả variants khác của product này thành false
                $this->repository->getModel()
                    ->where('product_id', $productId)
                    ->where('id', '!=', $this->model?->id ?? 0)
                    ->update(['is_default' => false]);
            }
        }
        
        // Nếu tạo mới và không có management_type trong request, lấy từ product
        if (!$this->model || !$this->model->exists) {
            $productId = $this->request->input('product_id');
            if ($productId && !$this->request->has('management_type')) {
                $product = \App\Models\Product::find($productId);
                if ($product) {
                    $this->modelData['management_type'] = $product->management_type ?? 'basic';
                    $this->modelData['track_inventory'] = $product->track_inventory ?? true;
                    $this->modelData['allow_negative_stock'] = $product->allow_negative_stock ?? false;
                }
            }
        }
        
        return $this;
    }

    protected function beforeSave(): static
    {
        // Lưu management_type và stock_quantity cũ trước khi update
        if ($this->model && $this->model->exists) {
            $oldModel = $this->repository->getModel()->find($this->model->id);
            $this->oldManagementType = $oldModel ? ($oldModel->management_type ?? 'batch') : ($this->model->management_type ?? 'batch');
            
            // Nếu quản lý theo batch, lấy stock từ product_batch_warehouses
            if ($this->oldManagementType === 'batch' && $oldModel) {
                $this->oldStockQuantity = (int) \App\Models\ProductBatchWarehouse::query()
                    ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
                    ->where('product_batches.product_variant_id', $oldModel->id)
                    ->where('product_batches.status', 'active')
                    ->sum('product_batch_warehouses.stock_quantity');
                    
                // Cũng lưu stock theo từng warehouse
                $this->oldWarehouseStocks = \App\Models\ProductBatchWarehouse::query()
                    ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
                    ->where('product_batches.product_variant_id', $oldModel->id)
                    ->where('product_batches.status', 'active')
                    ->select('product_batch_warehouses.warehouse_id', DB::raw('SUM(product_batch_warehouses.stock_quantity) as total_stock'))
                    ->groupBy('product_batch_warehouses.warehouse_id')
                    ->get()
                    ->map(fn($item) => [
                        'warehouse_id' => $item->warehouse_id,
                        'stock_quantity' => (int) $item->total_stock,
                    ])
                    ->toArray();
            } else {
                $this->oldStockQuantity = $oldModel ? ($oldModel->stock_quantity ?? 0) : ($this->model->stock_quantity ?? 0);
                $this->oldWarehouseStocks = [];
            }
        } else {
            $this->oldManagementType = $this->model ? ($this->model->management_type ?? 'batch') : 'batch';
            $this->oldStockQuantity = $this->model ? ($this->model->stock_quantity ?? 0) : 0;
            $this->oldWarehouseStocks = [];
        }
        
        if ($this->model) {
            Log::info('ProductVariantService::beforeSave - Saved old values', [
                'variant_id' => $this->model->id ?? null,
                'old_management_type' => $this->oldManagementType,
                'old_stock_quantity' => $this->oldStockQuantity,
                'old_warehouse_stocks' => $this->oldWarehouseStocks ?? [],
            ]);
        }
        
        return $this;
    }

    protected function afterSave(): static
    {
        // Đảm bảo product luôn có 1 variant default
        $productId = $this->model->product_id ?? $this->request->input('product_id');
        if($productId){
            $this->ensureDefaultVariant($productId);
            
            // Invalidate cache của product khi variant thay đổi
            // Vì product cache chứa variants với warehouse_stocks
            // Flush toàn bộ cache products vì clearCache có thể không hoạt động đúng với tags
            $productService = app(\App\Services\Interfaces\Product\ProductServiceInterface::class);
            $productService->clearModuleCache();
        }
        
        return parent::afterSave();
    }

    /**
     * Đảm bảo product luôn có 1 variant default
     */
    public function ensureDefaultVariant(int $productId): void
    {
        $defaultVariant = $this->repository->getModel()
            ->where('product_id', $productId)
            ->where('is_default', true)
            ->first();
            
        if(!$defaultVariant){
            // Nếu không có variant default, set variant đầu tiên thành default
            $firstVariant = $this->repository->getModel()
                ->where('product_id', $productId)
                ->orderBy('id', 'asc')
                ->first();
                
            if($firstVariant){
                $firstVariant->update(['is_default' => true]);
            }
        }
    }

    /**
     * Override withRelation để xử lý attributes relation và warehouse stocks
     */
    protected function withRelation(): static {
        if($this->request->has('attributes')){
            $this->model->attributes()->sync($this->request->input('attributes', []));
        }
        
        // Sync warehouse stocks for variant
        $oldManagementType = $this->oldManagementType ?? ($this->model->management_type ?? 'batch');
        $newManagementType = $this->request->input('management_type') ?? $this->model->management_type ?? 'batch';
        
        Log::info('ProductVariantService::withRelation - Management type check', [
            'variant_id' => $this->model->id,
            'old_management_type' => $oldManagementType,
            'new_management_type' => $newManagementType,
            'old_management_type_saved' => $this->oldManagementType,
        ]);
        $warehouseStocks = [];
        
        if ($this->request->has('warehouse_stocks')) {
            $warehouseStocks = (array) $this->request->input('warehouse_stocks', []);
        }
        
        // Xử lý chuyển từ batch sang basic/simple
        if ($oldManagementType === 'batch' && $newManagementType !== 'batch') {
            Log::info('ProductVariantService::withRelation - Converting from batch to basic', [
                'variant_id' => $this->model->id,
                'old_management_type' => $oldManagementType,
                'new_management_type' => $newManagementType,
                'old_stock_quantity' => $this->oldStockQuantity,
                'old_warehouse_stocks' => $this->oldWarehouseStocks,
            ]);
            
            // Sử dụng warehouse_stocks đã được tính từ beforeSave
            if (!empty($this->oldWarehouseStocks)) {
                // Chuyển stock từ batches sang warehouse_stocks (đã tính trong beforeSave)
                $warehouseStocks = $this->oldWarehouseStocks;
                Log::info('ProductVariantService::withRelation - Using old warehouse stocks from batches', [
                    'variant_id' => $this->model->id,
                    'warehouse_stocks' => $warehouseStocks,
                ]);
            } else if ($this->oldStockQuantity > 0) {
                // Nếu không có warehouse_stocks từ batches nhưng có stock_quantity
                $defaultWarehouseId = $this->warehouseService->getDefaultWarehouseId();
                Log::info('ProductVariantService::withRelation - Using old stock quantity for default warehouse', [
                    'variant_id' => $this->model->id,
                    'stock_quantity' => $this->oldStockQuantity,
                    'default_warehouse_id' => $defaultWarehouseId,
                ]);
                
                if ($defaultWarehouseId) {
                    $warehouseStocks = [[
                        'warehouse_id' => $defaultWarehouseId,
                        'stock_quantity' => $this->oldStockQuantity,
                        'storage_location' => null,
                    ]];
                }
            } else {
                Log::info('ProductVariantService::withRelation - No old stock to transfer', [
                    'variant_id' => $this->model->id,
                ]);
            }
            
            // Xóa tất cả warehouse_stocks cũ trước khi sync mới
            $this->variantWarehouseStockRepo->getModel()
                ->where('product_variant_id', $this->model->id)
                ->delete();
            
            Log::info('ProductVariantService::withRelation - Warehouse stocks to sync', [
                'variant_id' => $this->model->id,
                'warehouse_stocks' => $warehouseStocks,
            ]);
            
            // Sync warehouse_stocks mới
            if (!empty($warehouseStocks)) {
                foreach ($warehouseStocks as $stockData) {
                    $result = $this->variantWarehouseStockRepo->updateOrCreateStock(
                        [
                            'product_variant_id' => $this->model->id,
                            'warehouse_id' => (int) $stockData['warehouse_id'],
                        ],
                        [
                            'stock_quantity' => (int) ($stockData['stock_quantity'] ?? 0),
                            'storage_location' => $stockData['storage_location'] ?? null,
                        ]
                    );
                    Log::info('ProductVariantService::withRelation - Warehouse stock synced', [
                        'variant_id' => $this->model->id,
                        'warehouse_id' => $stockData['warehouse_id'],
                        'stock_quantity' => $stockData['stock_quantity'],
                    ]);
                }
            } else {
                Log::warning('ProductVariantService::withRelation - No warehouse stocks to sync', [
                    'variant_id' => $this->model->id,
                ]);
            }
        } else if ($newManagementType !== 'batch') {
            // Nếu không phải chuyển từ batch sang basic, sync warehouse_stocks bình thường
            if ($this->request->has('warehouse_stocks')) {
                if (!empty($warehouseStocks)) {
                    // Lấy danh sách warehouse_id hiện tại
                    $existingWarehouseIds = $this->variantWarehouseStockRepo->getModel()
                        ->where('product_variant_id', $this->model->id)
                        ->pluck('warehouse_id')
                        ->toArray();
                    
                    // Lấy danh sách warehouse_id mới
                    $newWarehouseIds = array_map(function($stock) {
                        return (int) $stock['warehouse_id'];
                    }, $warehouseStocks);
                    
                    // Xóa các warehouse_stocks không còn trong danh sách mới
                    $toDelete = array_diff($existingWarehouseIds, $newWarehouseIds);
                    if (!empty($toDelete)) {
                        $this->variantWarehouseStockRepo->getModel()
                            ->where('product_variant_id', $this->model->id)
                            ->whereIn('warehouse_id', $toDelete)
                            ->delete();
                    }
                    
                    // Update or create warehouse stocks
            foreach ($warehouseStocks as $stockData) {
                $this->variantWarehouseStockRepo->updateOrCreateStock(
                    [
                        'product_variant_id' => $this->model->id,
                        'warehouse_id' => (int) $stockData['warehouse_id'],
                    ],
                    [
                        'stock_quantity' => (int) ($stockData['stock_quantity'] ?? 0),
                        'storage_location' => $stockData['storage_location'] ?? null,
                    ]
                );
            }
                } else {
                    // Nếu warehouse_stocks rỗng và request có warehouse_stocks (nghĩa là user xóa tất cả)
                    // Thì xóa tất cả warehouse_stocks cũ
                    $this->variantWarehouseStockRepo->getModel()
                        ->where('product_variant_id', $this->model->id)
                        ->delete();
                }
            }
            // Nếu request không có warehouse_stocks, không làm gì (giữ nguyên warehouse_stocks cũ)
        }
        // Nếu management_type === 'batch', warehouse_stocks được quản lý bởi batches, không cần sync
        
        return $this;
    }

    /**
     * Update warehouse stocks for a variant and create logs
     */
    public function updateWarehouseStocks(Request $request, int $variantId): bool
    {
        $variant = $this->show($variantId);
        if (!$variant) {
            return false;
        }

        $warehouseStocks = (array) $request->input('warehouse_stocks', []);
        $reason = $request->input('reason');

        try {
            $this->beginTransaction()
                ->setRequest($request)
                ->processVariantWarehouseStocksUpdate($variantId, $warehouseStocks, $reason)
                ->commit();
            
            // Clear cache for this variant to ensure fresh data is loaded
            $this->clearCache($variantId);
            
            return true;
        } catch (\Throwable $th) {
            \Illuminate\Support\Facades\Log::error('Update variant warehouse stocks failed: ', [
                'service' => static::class,
                'message' => $th->getMessage(),
                'file' => $th->getFile(),
                'line' => $th->getLine(),
            ]);
            $this->rollback();
            return false;
        }
    }

    /**
     * Process variant warehouse stocks update and create logs
     */
    protected function processVariantWarehouseStocksUpdate(int $variantId, array $warehouseStocks, ?string $reason): static
    {
        // Lấy stock hiện tại trước khi update để phát hiện chuyển kho
        $beforeStocks = [];
        foreach ($warehouseStocks as $stockData) {
            $warehouseId = (int) $stockData['warehouse_id'];
            $existingStock = $this->variantWarehouseStockRepo->findByVariantAndWarehouse($variantId, $warehouseId);
            $beforeStocks[$warehouseId] = $existingStock ? (int) $existingStock->stock_quantity : 0;
        }

        // Update warehouse stocks
        foreach ($warehouseStocks as $stockData) {
            $warehouseId = (int) $stockData['warehouse_id'];
            $newStockQuantity = (int) ($stockData['stock_quantity'] ?? 0);
            $storageLocation = $stockData['storage_location'] ?? null;

            // Get existing stock
            $beforeStock = $beforeStocks[$warehouseId] ?? 0;
            $changeStock = $newStockQuantity - $beforeStock;

            // Update or create warehouse stock
            $this->variantWarehouseStockRepo->updateOrCreateStock(
                [
                    'product_variant_id' => $variantId,
                    'warehouse_id' => $warehouseId,
                ],
                [
                    'stock_quantity' => $newStockQuantity,
                    'storage_location' => $storageLocation,
                ]
            );

            // Create log if stock changed
            if ($changeStock !== 0) {
                $this->variantWarehouseStockLogRepo->create([
                    'product_variant_id' => $variantId,
                    'warehouse_id' => $warehouseId,
                    'before_stock' => $beforeStock,
                    'change_stock' => $changeStock,
                    'after_stock' => $newStockQuantity,
                    'reason' => $reason,
                    'transaction_type' => 'variant',
                    'user_id' => Auth::id(),
                ]);
            }
        }

        // Phát hiện và xử lý chuyển kho: tìm các kho có stock giảm và kho có stock tăng
        $decreasedWarehouses = [];
        $increasedWarehouses = [];
        foreach ($warehouseStocks as $stockData) {
            $warehouseId = (int) $stockData['warehouse_id'];
            $newStockQuantity = (int) ($stockData['stock_quantity'] ?? 0);
            $beforeStock = $beforeStocks[$warehouseId] ?? 0;
            $changeStock = $newStockQuantity - $beforeStock;

            if ($changeStock < 0) {
                $decreasedWarehouses[] = [
                    'warehouse_id' => $warehouseId,
                    'decrease' => abs($changeStock),
                ];
            } elseif ($changeStock > 0) {
                $increasedWarehouses[] = [
                    'warehouse_id' => $warehouseId,
                    'increase' => $changeStock,
                ];
            }
        }

        // Nếu có cả kho giảm và kho tăng, có thể là chuyển kho
        if (!empty($decreasedWarehouses) && !empty($increasedWarehouses)) {
            $this->handleBatchTransferForVariant($variantId, $decreasedWarehouses, $increasedWarehouses, $reason);
            // Sync lại warehouse stock từ batch sau khi chuyển kho
            $this->syncWarehouseStockFromBatches($variantId);
        }

        $this->result = true;
        return $this;
    }

    /**
     * Handle batch transfer when variant warehouse stock is transferred
     */
    protected function handleBatchTransferForVariant(int $variantId, array $decreasedWarehouses, array $increasedWarehouses, ?string $reason): void
    {
        // Lấy tất cả batches của variant
        $batches = \App\Models\ProductBatch::where('product_variant_id', $variantId)
            ->where('status', 'active')
            ->with('warehouseStocks')
            ->get();

        if ($batches->isEmpty()) {
            return;
        }

        // Xử lý chuyển kho cho từng batch
        foreach ($batches as $batch) {
            $warehouseStocks = $batch->warehouseStocks;
            
            // Tìm kho nguồn có stock để chuyển
            foreach ($decreasedWarehouses as $decreased) {
                $sourceWarehouseId = $decreased['warehouse_id'];
                $decreaseAmount = $decreased['decrease'];
                
                $sourceBatchWarehouse = $warehouseStocks->firstWhere('warehouse_id', $sourceWarehouseId);
                if (!$sourceBatchWarehouse || $sourceBatchWarehouse->stock_quantity <= 0) {
                    continue;
                }

                // Tìm kho đích để chuyển đến
                foreach ($increasedWarehouses as $increased) {
                    $targetWarehouseId = $increased['warehouse_id'];
                    $increaseAmount = $increased['increase'];
                    
                    // Tính số lượng chuyển (lấy min của decrease và increase còn lại)
                    $transferQuantity = min($decreaseAmount, $increaseAmount, $sourceBatchWarehouse->stock_quantity);
                    if ($transferQuantity <= 0) {
                        continue;
                    }

                    // Thực hiện chuyển kho (không sync ở đây, sẽ sync sau khi tất cả hoàn thành)
                    $this->transferBatchStockWithoutSync($batch, $sourceWarehouseId, $targetWarehouseId, $transferQuantity, $reason);
                    
                    // Giảm số lượng đã chuyển
                    $decreased['decrease'] -= $transferQuantity;
                    $increased['increase'] -= $transferQuantity;
                    
                    if ($decreased['decrease'] <= 0) break;
                }
            }
        }

        // Sync lại warehouse stock từ batch sau khi tất cả chuyển kho hoàn thành
        $this->syncWarehouseStockFromBatches($variantId);
        $this->clearCache($variantId);
    }

    /**
     * Transfer batch stock between warehouses (with sync)
     */
    protected function transferBatchStock(\App\Models\ProductBatch $batch, int $fromWarehouseId, int $toWarehouseId, int $quantity, ?string $reason): void
    {
        $this->transferBatchStockWithoutSync($batch, $fromWarehouseId, $toWarehouseId, $quantity, $reason);
        
        // Sync lại warehouse stock từ batch sau khi chuyển
        if ($batch->product_variant_id) {
            $this->syncWarehouseStockFromBatches($batch->product_variant_id);
            $this->clearCache($batch->product_variant_id);
        } else {
            // Nếu là product (không phải variant), cần gọi ProductService
            $productService = app(\App\Services\Interfaces\Product\ProductServiceInterface::class);
            $productService->syncWarehouseStockFromBatches($batch->product_id);
            $productService->clearCache($batch->product_id);
        }
    }

    /**
     * Transfer batch stock between warehouses (without sync - for batch operations)
     */
    protected function transferBatchStockWithoutSync(\App\Models\ProductBatch $batch, int $fromWarehouseId, int $toWarehouseId, int $quantity, ?string $reason): void
    {
        if ($fromWarehouseId == $toWarehouseId || $quantity <= 0) {
            return;
        }

        DB::transaction(function () use ($batch, $fromWarehouseId, $toWarehouseId, $quantity, $reason) {
            // Lock và lấy stock tại kho nguồn
            $sourceBatchWarehouse = \App\Models\ProductBatchWarehouse::lockForUpdate()
                ->where('product_batch_id', $batch->id)
                ->where('warehouse_id', $fromWarehouseId)
                ->first();
            
            if (!$sourceBatchWarehouse || $sourceBatchWarehouse->stock_quantity < $quantity) {
                return;
            }

            // Lấy hoặc tạo stock tại kho đích
            $targetBatchWarehouse = \App\Models\ProductBatchWarehouse::lockForUpdate()
                ->firstOrNew([
                    'product_batch_id' => $batch->id,
                    'warehouse_id' => $toWarehouseId,
                ]);

            // Lưu số lượng trước khi thay đổi
            $sourceBeforeStock = (int) $sourceBatchWarehouse->stock_quantity;
            $targetBeforeStock = (int) ($targetBatchWarehouse->stock_quantity ?? 0);

            // Trừ ở kho nguồn
            $sourceBatchWarehouse->stock_quantity = $sourceBeforeStock - $quantity;
            $sourceBatchWarehouse->save();

            // Cộng ở kho đích
            $targetBatchWarehouse->stock_quantity = $targetBeforeStock + $quantity;
            $targetBatchWarehouse->save();

            // Ghi log cho kho nguồn (trừ)
            \App\Models\ProductBatchStockLog::create([
                'product_batch_id' => $batch->id,
                'product_id' => $batch->product_id,
                'product_variant_id' => $batch->product_variant_id,
                'warehouse_id' => $fromWarehouseId,
                'before_stock' => $sourceBeforeStock,
                'change_stock' => -$quantity,
                'after_stock' => $sourceBatchWarehouse->stock_quantity,
                'reason' => ($reason ?: 'Chuyển kho') . ' → Kho #' . $toWarehouseId,
                'user_id' => Auth::id(),
                'transaction_type' => 'transfer',
            ]);

            // Ghi log cho kho đích (cộng)
            \App\Models\ProductBatchStockLog::create([
                'product_batch_id' => $batch->id,
                'product_id' => $batch->product_id,
                'product_variant_id' => $batch->product_variant_id,
                'warehouse_id' => $toWarehouseId,
                'before_stock' => $targetBeforeStock,
                'change_stock' => $quantity,
                'after_stock' => $targetBatchWarehouse->stock_quantity,
                'reason' => ($reason ?: 'Chuyển kho') . ' ← Kho #' . $fromWarehouseId,
                'user_id' => Auth::id(),
                'transaction_type' => 'transfer',
            ]);
        });

        // Sync lại warehouse stock từ batch sau khi chuyển
        if ($batch->product_variant_id) {
            $this->syncWarehouseStockFromBatches($batch->product_variant_id);
            $this->clearCache($batch->product_variant_id);
        } else {
            // Nếu là product (không phải variant), cần gọi ProductService
            $productService = app(\App\Services\Interfaces\Product\ProductServiceInterface::class);
            $productService->syncWarehouseStockFromBatches($batch->product_id);
            $productService->clearCache($batch->product_id);
        }
    }

    public function syncForProduct(int $productId, array $variants, array $attributeIdsByIndex = []): array
    {
        $productId = (int) $productId;
        if ($productId <= 0) return [];
        if (!is_array($variants)) return [];

        // Lấy product để lấy management_type và các settings mặc định
        $product = \App\Models\Product::find($productId);
        $productManagementType = $product ? ($product->management_type ?? 'basic') : 'basic';
        $productTrackInventory = $product ? ($product->track_inventory ?? true) : true;
        $productAllowNegativeStock = $product ? ($product->allow_negative_stock ?? false) : false;

        $processedIds = [];

        foreach ($variants as $idx => $variantData) {
            if (!is_array($variantData)) continue;

            $sku = $this->ensureUniqueSku($productId, (array) $variantData, (int) $idx);

            // Chỉ lấy management_type từ product nếu tạo mới và variantData không có
            $maybeId = $variantData['id'] ?? null;
            $shouldUpdate = is_numeric($maybeId) && $this->repository->getModel()->whereKey((int) $maybeId)->exists();

            $payload = [
                'product_id' => $productId,
                'sku' => $sku,
                'retail_price' => (float) ($variantData['retail_price'] ?? 0),
                'wholesale_price' => array_key_exists('wholesale_price', $variantData) ? (float) ($variantData['wholesale_price'] ?? 0) : null,
                'cost_price' => array_key_exists('cost_price', $variantData) ? (float) ($variantData['cost_price'] ?? 0) : null,
                'stock_quantity' => (int) ($variantData['stock_quantity'] ?? 0),
                'image' => $variantData['image'] ?? null,
                'barcode' => $variantData['barcode'] ?? null,
                'album' => $variantData['album'] ?? null,
                'is_default' => (bool) ($variantData['is_default'] ?? false),
            ];

            // Nếu tạo mới và không có management_type trong variantData, lấy từ product
            if (!$shouldUpdate && !isset($variantData['management_type'])) {
                $payload['management_type'] = $productManagementType;
                $payload['track_inventory'] = $productTrackInventory;
                $payload['allow_negative_stock'] = $productAllowNegativeStock;
            } else if (isset($variantData['management_type'])) {
                // Nếu có management_type trong variantData, dùng nó
                $payload['management_type'] = $variantData['management_type'];
                if (isset($variantData['track_inventory'])) {
                    $payload['track_inventory'] = (bool) $variantData['track_inventory'];
                }
                if (isset($variantData['allow_negative_stock'])) {
                    $payload['allow_negative_stock'] = (bool) $variantData['allow_negative_stock'];
                }
            }

            $model = null;

            // Only update if ID exists in DB (UI uses temp numeric-like IDs)
            if ($shouldUpdate) {
                $model = $this->repository->update((int) $maybeId, $payload);
            } else {
                $model = $this->repository->create($payload);
            }

            if ($model && $model->id) {
                $processedIds[] = (int) $model->id;

                $attrIds = $attributeIdsByIndex[$idx] ?? [];
                if (is_array($attrIds) && count($attrIds)) {
                    $model->attributes()->sync($attrIds);
                } else {
                    // If no attrs, keep empty sync (optional) - do nothing to avoid wiping on partial payload
                }
            }
        }

        // Delete removed variants for this product
        if (count($processedIds)) {
            $this->repository->getModel()
                ->where('product_id', $productId)
                ->whereNotIn('id', $processedIds)
                ->delete();
        } else {
            // If caller sends empty variants array, do nothing (avoid mass delete)
        }

        // Ensure default variant consistency
        $this->ensureDefaultVariant($productId);

        // Invalidate caches for variants module
        $this->invalidateCache();

        return $processedIds;
    }

    private function ensureUniqueSku(int $productId, array $variantData, int $index): string
    {
        $sku = trim((string) ($variantData['sku'] ?? ''));
        if ($sku !== '') {
            // If SKU already exists but belongs to this same variant id, accept; otherwise ensure uniqueness
            $maybeId = $variantData['id'] ?? null;
            $query = $this->repository->getModel()->where('sku', $sku);
            if (is_numeric($maybeId)) {
                $query->where('id', '!=', (int) $maybeId);
            }
            $exists = $query->exists();
            if (!$exists) return $sku;
        }

        $prefix = $productId > 0 ? "P{$productId}-V" : "V";

        // Deterministic first
        $candidate = $prefix . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
        if (!$this->repository->getModel()->where('sku', $candidate)->exists()) {
            return $candidate;
        }

        do {
            $candidate = $prefix . Str::upper(Str::random(8));
        } while ($this->repository->getModel()->where('sku', $candidate)->exists());

        return $candidate;
    }

    /**
     * Recalculate and sync warehouse stock based on batches for a variant
     * Used when variant has management_type = 'batch'
     */
    public function syncWarehouseStockFromBatches(int $variantId): void
    {
        // Chỉ sync khi management_type = 'batch'
        $variant = $this->repository->getModel()->find($variantId);
        if (!$variant || $variant->management_type !== 'batch') {
            // Không sync nếu management_type != 'batch'
            return;
        }
        
        // Tính tổng số lượng từ product_batch_warehouses thông qua product_batches
        $warehouseStocks = \App\Models\ProductBatchWarehouse::query()
            ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
            ->where('product_batches.product_variant_id', $variantId)
            ->where('product_batches.status', 'active')
            ->select('product_batch_warehouses.warehouse_id', DB::raw('SUM(product_batch_warehouses.stock_quantity) as total_stock'))
            ->groupBy('product_batch_warehouses.warehouse_id')
            ->get();

        DB::transaction(function () use ($variantId, $warehouseStocks) {
            $warehouseIds = [];
            foreach ($warehouseStocks as $stockStats) {
                if (!$stockStats->warehouse_id) continue;
                $warehouseIds[] = $stockStats->warehouse_id;

                $this->variantWarehouseStockRepo->updateOrCreateStock(
                    [
                        'product_variant_id' => $variantId,
                        'warehouse_id' => $stockStats->warehouse_id,
                    ],
                    [
                        'stock_quantity' => (int)$stockStats->total_stock,
                    ]
                );
            }
            
            // Set 0 for warehouses not in the batches but exist in warehouse_stocks
            if (empty($warehouseIds)) {
                \App\Models\ProductVariantWarehouseStock::where('product_variant_id', $variantId)
                   ->update(['stock_quantity' => 0]);
            } else {
                \App\Models\ProductVariantWarehouseStock::where('product_variant_id', $variantId)
                   ->whereNotIn('warehouse_id', $warehouseIds)
                   ->update(['stock_quantity' => 0]);
            }
        });
    }

    /**
     * Clear cache for a specific variant
     */
    public function clearCache(int $id): void
    {
        $this->forgetCache($this->getShowCacheKey($id));
    }
}

