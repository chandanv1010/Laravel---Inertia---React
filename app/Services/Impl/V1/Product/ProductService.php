<?php  
namespace App\Services\Impl\V1\Product;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use App\Repositories\Product\ProductRepo;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\SvgWriter;
use App\Traits\HasRouter;
use App\Traits\HasRelationMerge;
use App\Traits\HasCatalogueFilter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use App\Services\Interfaces\Attribute\AttributeCatalogueServiceInterface;
use App\Services\Interfaces\Attribute\AttributeServiceInterface;
use App\Services\Interfaces\Core\TagServiceInterface;
use App\Services\Interfaces\Product\PricingTierServiceInterface;
use App\Services\Interfaces\Setting\TaxSettingServiceInterface;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface;
use App\Repositories\Product\ProductWarehouseStockRepo;
use App\Repositories\Product\ProductWarehouseStockLogRepo;
use App\Repositories\Product\ProductBatchWarehouseRepo;

class ProductService extends BaseCacheService implements ProductServiceInterface {

    use HasRouter, HasRelationMerge, HasCatalogueFilter;

    protected $repository;
    protected $productCatalogueService;
    protected $productVariantService;
    protected $attributeCatalogueService;
    protected $attributeService;
    protected $tagService;
    protected $pricingTierService;
    protected $taxSettingService;
    protected $warehouseService;
    protected $warehouseStockRepo;
    protected $warehouseStockLogRepo;
    protected $batchWarehouseRepo;

    // Cache strategy: 'dataset' phù hợp cho products vì có nhiều filter và search
    protected string $cacheStrategy = 'dataset';
    protected string $module = 'products';
    
    // Catalogue filter config - tái sử dụng từ trait HasCatalogueFilter
    protected string $catalogueFilterField = 'product_catalogue_id';
    protected string $catalogueMainRelationKey = 'product_catalogue_id';
    protected string $cataloguePivotRelationName = 'product_catalogues';
    protected string $catalogueTable = 'product_catalogues';

    protected $with = [
        'creators',
        'current_languages',
        'product_catalogue',
        'product_catalogues.current_languages',
        'languages',
        'pricingTiers',
        'tags',
        'variants',
        'variants.product', // CRITICAL: Need parent product for variant pricing fallback
        'variants.attributes',
        'variants.attributes.attribute_catalogue.current_languages',
        'variants.warehouseStocks',
        'variants.batches.warehouseStocks',
        'warehouseStocks',
        'batches.warehouseStocks',
        'reviews', // Load reviews for rating calculation
    ];
    protected $simpleFilter = ['publish', 'user_id']; // product_catalogue_id sẽ được xử lý đặc biệt trong ProductRepo
    protected $searchFields = ['name', 'description'];
    protected $isMultipleLanguage = true; // Search trong pivot table product_language
    protected $pivotTable = 'product_language'; // Tên bảng pivot cho search
    protected $pivotForeignKey = 'product_id'; // Foreign key trong pivot table
    protected $sort = [['order', 'desc'], ['id', 'desc']];

    // Pivot fields cho language
    protected $pivotFields = [
        'extends' => [],
        'except' => []
    ];

    // Language fields
    protected $languageFields = [
        'extends' => [],
        'except' => []
    ];

    public function __construct(
        ProductRepo $repository,
        ProductCatalogueServiceInterface $productCatalogueService,
        ProductVariantServiceInterface $productVariantService,
        AttributeCatalogueServiceInterface $attributeCatalogueService,
        AttributeServiceInterface $attributeService,
        TagServiceInterface $tagService,
        PricingTierServiceInterface $pricingTierService,
        TaxSettingServiceInterface $taxSettingService,
        WarehouseServiceInterface $warehouseService,
        ProductWarehouseStockRepo $warehouseStockRepo,
        ProductWarehouseStockLogRepo $warehouseStockLogRepo,
        ProductBatchWarehouseRepo $batchWarehouseRepo
    )
    {
        $this->repository = $repository;
        $this->productCatalogueService = $productCatalogueService;
        $this->productVariantService = $productVariantService;
        $this->attributeCatalogueService = $attributeCatalogueService;
        $this->attributeService = $attributeService;
        $this->tagService = $tagService;
        $this->pricingTierService = $pricingTierService;
        $this->taxSettingService = $taxSettingService;
        $this->warehouseService = $warehouseService;
        $this->warehouseStockRepo = $warehouseStockRepo;
        $this->warehouseStockLogRepo = $warehouseStockLogRepo;
        $this->batchWarehouseRepo = $batchWarehouseRepo;
        $this->catalogueService = $productCatalogueService; // Set cho trait HasCatalogueFilter
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        
        // Luôn set user_id từ Auth (trừ khi toggle đã skip beforeSave)
        if(!$this->skipBeforeSave){
            $this->modelData['user_id'] = Auth::id();
        }
        
        // Xử lý product_catalogue_id: nếu có thì set
        if($this->request->has('product_catalogue_id')){
            $this->modelData['product_catalogue_id'] = $this->request->input('product_catalogue_id') ?: null;
        }

        // Normalize boolean fields (checkbox can submit "on")
        // Only normalize when fields are present to avoid overriding partial updates (e.g. order/publish toggles).
        if ($this->request->has('track_inventory')) {
            $this->modelData['track_inventory'] = $this->request->boolean('track_inventory') ? 1 : 0;
        }
        if ($this->request->has('allow_negative_stock')) {
            $this->modelData['allow_negative_stock'] = $this->request->boolean('allow_negative_stock') ? 1 : 0;
        }

        // Tax snapshot (product-level)
        if ($this->request->has('apply_tax')) {
            $applyTax = $this->request->boolean('apply_tax');
            $tax = $this->taxSettingService->get();

            $this->modelData['apply_tax'] = $applyTax ? 1 : 0;
            if ($applyTax && !empty($tax['enabled'])) {
                $this->modelData['tax_mode'] = 'inherit';
                $this->modelData['tax_included'] = !empty($tax['price_includes_tax']) ? 1 : 0;
                $this->modelData['sale_tax_rate'] = (float) ($tax['sale_tax_rate'] ?? 0);
                $this->modelData['purchase_tax_rate'] = (float) ($tax['purchase_tax_rate'] ?? 0);
            } else {
                $this->modelData['tax_mode'] = 'none';
                $this->modelData['tax_included'] = 0;
                $this->modelData['sale_tax_rate'] = 0;
                $this->modelData['purchase_tax_rate'] = 0;
            }
        }
        
        return $this;
    }

    protected function beforeSave(): static {
        // Chỉ xử lý language pivot fields nếu có language fields trong request
        // Tránh lỗi khi chỉ update order hoặc publish
        if($this->request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'meta_keyword', 'meta_description'])){
            $this->handlePivotLanguageFields();
        }
        
        // Chuẩn bị dữ liệu product_catalogues: merge product_catalogue_id vào product_catalogues array
        // Để withRelation có thể sync đúng (withRelation chạy trước afterSave)
        $this->mergeMainRelationToPivot('product_catalogue_id', 'product_catalogues');
        
        // Xử lý chuyển đổi management_type nếu có thay đổi (chỉ khi đang update, không phải create)
        // Lấy product ID từ route parameter hoặc request
        $productId = null;
        if ($this->request->route('product')) {
            $productId = (int) $this->request->route('product');
        } elseif ($this->request->has('id')) {
            $productId = (int) $this->request->input('id');
        }
        
        if ($this->request->has('management_type') && $productId) {
            $newManagementType = $this->request->input('management_type');
            
            // Lấy product hiện tại từ database để so sánh
            $currentProduct = $this->repository->findById($productId);
            if ($currentProduct && $currentProduct->management_type !== $newManagementType) {
                // Sử dụng Pipeline Pattern để xử lý chuyển đổi management_type
                $this->handleManagementTypeChangeViaPipeline($productId, $currentProduct->management_type, $newManagementType);
            }
        }
        
        return $this;
    }

    protected function afterSave(): static {
        // Tạo router cho product - chỉ khi có canonical (tránh lỗi khi chỉ update order/publish)
        // Use relation method to avoid attribute access issues (especially in tests/mocks)
        $hasRouter = $this->model && method_exists($this->model, 'routers') ? $this->model->routers()->exists() : false;
        if($this->request->has('canonical') || $hasRouter){
            $this->syncRouter($this->module, 'ProductPage', 'App\Http\Controllers\Frontend\Product\ProductController');
        }
        
        // Generate QR code cho product nếu có router/canonical
        $this->generateQrCode();
        
        return parent::afterSave();
    }

    /**
     * Override paginate để xử lý filter catalogue với nested set
     * Sử dụng trait HasCatalogueFilter để tái sử dụng logic
     */
    public function paginate(Request $request){
        $this->setRequest($request);
        $specifications = $this->specifications();
        
        // Xử lý filter catalogue với nested set - logic từ trait
        $specifications = $this->handleCatalogueFilter($specifications);
        
        // Gọi parent paginate (có cache)
        return parent::paginate($request);
    }

    /**
     * Override specifications để merge catalogue_ids từ request vào filter
     * Sử dụng trait HasCatalogueFilter để tái sử dụng logic
     */
    /**
     * Override specifications để merge catalogue_ids từ request vào filter
     * Sử dụng trait HasCatalogueFilter để tái sử dụng logic
     */
    protected function specifications(): array {
        $specs = parent::specifications();
        
        // Merge catalogue_ids từ trait
        $specs = $this->mergeCatalogueIdsToSpecs($specs);
        
        // --- Custom Filter Handling ---

        // 1. Price Filter (min_price, max_price) -> complex filter on retail_price
        // Check manually because they are not in parameter map
        if ($this->request->has('min_price') && !is_null($this->request->input('min_price'))) {
            $minPrice = $this->request->input('min_price');
            // Add to complex filter: retail_price >= minPrice
            $specs['filter']['complex']['retail_price']['gte'] = $minPrice;
        }

        if ($this->request->has('max_price') && !is_null($this->request->input('max_price'))) {
            $maxPrice = $this->request->input('max_price');
            // Add to complex filter: retail_price <= maxPrice
            $specs['filter']['complex']['retail_price']['lte'] = $maxPrice;
        }

        // 2. Attributes Filter
        // Pass to specs so Repository can handle it (needs update in ProductRepo)
        if ($this->request->has('attributes') && !empty($this->request->input('attributes'))) {
            $specs['filter']['attributes'] = $this->request->input('attributes');
        }

        return $specs;
    }

    /**
     * Override withRelation để xử lý đặc biệt cho languages relation
     * Sử dụng syncWithoutDetaching để không xóa các bản dịch đã có
     */
    protected function withRelation(): static {
        // 1) Prepare tags for BaseService::withRelation (expects IDs)
        if ($this->request->has('tags')) {
            $tagIds = $this->tagService->resolveIdsByNames((array) $this->request->input('tags', []), 'product');
            $this->request->merge(['tags' => $tagIds]);
        }

        // 2) Use default relation syncing (product_catalogues, languages, tags)
        $relationable = $this->repository->getRelationable() ?? [];
        if (count($relationable)) {
            foreach ($relationable as $relation) {
                if ($this->request->has($relation)) {
                    if ($relation === 'languages') {
                        $this->model->{$relation}()->syncWithoutDetaching($this->request->{$relation});
                    } else {
                        $this->model->{$relation}()->sync($this->request->{$relation});
                    }
                }
            }
        }

        // 3) Sync pricing tiers via PricingTierService (no model usage here)
        if ($this->request->has('pricing_tiers')) {
            $this->pricingTierService->syncForProduct((int) $this->model->id, (array) $this->request->input('pricing_tiers', []));
        }

        // 4) Sync variants + their attribute pivots via services
        if ($this->request->has('variants')) {
            $languageId = (int) (config('app.language_id') ?? 1);
            $userId = (int) (Auth::id() ?? 0);

            $variants = (array) $this->request->input('variants', []);
            $attributeIdsByIndex = [];

            foreach ($variants as $idx => $variantData) {
                if (!is_array($variantData)) continue;
                $map = $variantData['attributes'] ?? null;
                if (!is_array($map) || empty($map)) continue;

                $ids = [];
                foreach ($map as $catalogueName => $value) {
                    $catalogueName = trim((string) $catalogueName);
                    $value = trim((string) $value);
                    if ($catalogueName === '' || $value === '') continue;

                    $catalogueId = $this->attributeCatalogueService->findOrCreateByName($catalogueName, $languageId, $userId);
                    if ($catalogueId <= 0) continue;

                    $attrId = $this->attributeService->findOrCreateValue($catalogueId, $value, $languageId, $userId);
                    if ($attrId > 0) $ids[] = $attrId;
                }

                if (count($ids)) $attributeIdsByIndex[(int) $idx] = array_values(array_unique($ids));
            }

            $this->productVariantService->syncForProduct((int) $this->model->id, $variants, $attributeIdsByIndex);
        }

        // 5) Sync warehouse stocks
        if ($this->request->has('warehouse_stocks')) {
            $warehouseStocks = (array) $this->request->input('warehouse_stocks', []);
            
            foreach ($warehouseStocks as $stockData) {
                $this->warehouseStockRepo->updateOrCreateStock(
                    [
                        'product_id' => $this->model->id,
                        'warehouse_id' => (int) $stockData['warehouse_id'],
                    ],
                    [
                        'stock_quantity' => (int) ($stockData['stock_quantity'] ?? 0),
                        'storage_location' => $stockData['storage_location'] ?? null,
                    ]
                );
            }
        }

        return $this;
    }

    /**
     * Update warehouse stocks for a product and create logs
     */
    public function updateWarehouseStocks(Request $request, int $productId): bool
    {
        $product = $this->show($productId);
        if (!$product) {
            return false;
        }

        $warehouseStocks = (array) $request->input('warehouse_stocks', []);
        $reason = $request->input('reason');

        try {
            $this->beginTransaction()
                ->setRequest($request)
                ->processWarehouseStocksUpdate($productId, $warehouseStocks, $reason)
                ->commit();
            
            // Clear cache for this product to ensure fresh data is loaded
            $this->forgetCache($this->getShowCacheKey($productId));
            
            return true;
        } catch (\Throwable $th) {
            Log::error('Update warehouse stocks failed: ', [
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
     * Process warehouse stocks update and create logs
     */
    protected function processWarehouseStocksUpdate(int $productId, array $warehouseStocks, ?string $reason): static
    {
        // Lấy stock hiện tại trước khi update để phát hiện chuyển kho
        $beforeStocks = [];
        foreach ($warehouseStocks as $stockData) {
            $warehouseId = (int) $stockData['warehouse_id'];
            $existingStock = $this->warehouseStockRepo->findByProductAndWarehouse($productId, $warehouseId);
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
            $this->warehouseStockRepo->updateOrCreateStock(
                [
                    'product_id' => $productId,
                    'warehouse_id' => $warehouseId,
                ],
                [
                    'stock_quantity' => $newStockQuantity,
                    'storage_location' => $storageLocation,
                ]
            );

            // Create log if stock changed
            if ($changeStock !== 0) {
                $this->warehouseStockLogRepo->create([
                    'product_id' => $productId,
                    'warehouse_id' => $warehouseId,
                    'before_stock' => $beforeStock,
                    'change_stock' => $changeStock,
                    'after_stock' => $newStockQuantity,
                    'reason' => $reason,
                    'transaction_type' => 'product',
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
            $this->handleBatchTransferForProduct($productId, $decreasedWarehouses, $increasedWarehouses, $reason);
            // Sync lại warehouse stock từ batch sau khi chuyển kho
            $this->syncWarehouseStockFromBatches($productId);
        }

        $this->result = true;
        return $this;
    }

    /**
     * Handle batch transfer when warehouse stock is transferred
     */
    protected function handleBatchTransferForProduct(int $productId, array $decreasedWarehouses, array $increasedWarehouses, ?string $reason): void
    {
        // Lấy tất cả batches của product (không phải variant)
        $batches = \App\Models\ProductBatch::where('product_id', $productId)
            ->whereNull('product_variant_id')
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
        $this->syncWarehouseStockFromBatches($productId);
        $this->clearCache($productId);
    }

    /**
     * Transfer batch stock between warehouses (with sync)
     */
    protected function transferBatchStock(\App\Models\ProductBatch $batch, int $fromWarehouseId, int $toWarehouseId, int $quantity, ?string $reason): void
    {
        $this->transferBatchStockWithoutSync($batch, $fromWarehouseId, $toWarehouseId, $quantity, $reason);
        
        // Sync lại warehouse stock từ batch sau khi chuyển
        if ($batch->product_variant_id) {
            $variantService = app(\App\Services\Interfaces\Product\ProductVariantServiceInterface::class);
            $variantService->syncWarehouseStockFromBatches($batch->product_variant_id);
            $variantService->clearCache($batch->product_variant_id);
        } else {
            $this->syncWarehouseStockFromBatches($batch->product_id);
            $this->clearCache($batch->product_id);
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

        \Illuminate\Support\Facades\DB::transaction(function () use ($batch, $fromWarehouseId, $toWarehouseId, $quantity, $reason) {
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
                'user_id' => \Illuminate\Support\Facades\Auth::id(),
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
                'user_id' => \Illuminate\Support\Facades\Auth::id(),
                'transaction_type' => 'transfer',
            ]);
        });

        // Sync lại warehouse stock từ batch sau khi chuyển
        if ($batch->product_variant_id) {
            $variantService = app(\App\Services\Interfaces\Product\ProductVariantServiceInterface::class);
            $variantService->syncWarehouseStockFromBatches($batch->product_variant_id);
            $variantService->clearCache($batch->product_variant_id);
        } else {
            $this->syncWarehouseStockFromBatches($batch->product_id);
            $this->clearCache($batch->product_id);
        }
    }

    /**
     * Generate QR code for product and save to qrcode field
     * QR code contains the product URL based on canonical
     */
    protected function generateQrCode(): void
    {
        if (!$this->model) {
            return;
        }

        // Get canonical from router (use relation method to avoid attribute access issues in tests/mocks)
        $router = $this->model->relationLoaded('routers')
            ? $this->model->getRelation('routers')
            : ($this->model->routers()->first());
        $canonical = $router?->canonical;

        // If no canonical, try to get from request
        if (!$canonical && $this->request->has('canonical')) {
            $canonical = $this->request->input('canonical');
        }

        // If still no canonical, skip QR code generation
        if (!$canonical) {
            return;
        }

        // Generate product URL
        $appUrl = config('app.url', 'http://localhost');
        $productUrl = rtrim($appUrl, '/') . '/' . ltrim($canonical, '/');

        try {
            // Create QR code using Builder constructor
            $builder = new Builder(
                writer: new SvgWriter(),
                data: $productUrl,
                encoding: new Encoding('UTF-8'),
                errorCorrectionLevel: ErrorCorrectionLevel::High,
                size: 300,
                margin: 10,
                roundBlockSizeMode: RoundBlockSizeMode::Margin
            );

            $result = $builder->build();

            // Get SVG string from result
            $svgString = $result->getString();

            // Save QR code SVG to model
            $this->model->qrcode = $svgString;
            $this->model->saveQuietly(); // Use saveQuietly to avoid triggering events
        } catch (\Exception $e) {
            // Log error but don't fail the save operation
            Log::error('Failed to generate QR code for product ' . $this->model->id . ': ' . $e->getMessage());
        }
    }

    /**
     * Clear cache for a specific product
     */
    public function clearCache(int $id): void
    {
        $this->forgetCache($this->getShowCacheKey($id));
    }

    /**
     * Recalculate and sync warehouse stock based on batches
     * Used when product has management_type = 'batch'
     */
    public function syncWarehouseStockFromBatches(int $productId): void
    {
        // Tính tổng số lượng từ product_batch_warehouses thông qua product_batches
        $warehouseStocks = \App\Models\ProductBatchWarehouse::query()
            ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
            ->where('product_batches.product_id', $productId)
            ->whereNull('product_batches.product_variant_id') // Chỉ batches của product, không phải variant
            ->where('product_batches.status', 'active')
            ->select('product_batch_warehouses.warehouse_id', \Illuminate\Support\Facades\DB::raw('SUM(product_batch_warehouses.stock_quantity) as total_stock'))
            ->groupBy('product_batch_warehouses.warehouse_id')
            ->get();

        \Illuminate\Support\Facades\DB::transaction(function () use ($productId, $warehouseStocks) {
             $warehouseIds = [];
             foreach ($warehouseStocks as $stockStats) {
                 if (!$stockStats->warehouse_id) continue;
                 $warehouseIds[] = $stockStats->warehouse_id;

                 $this->warehouseStockRepo->updateOrCreateStock(
                     [
                         'product_id' => $productId,
                         'warehouse_id' => $stockStats->warehouse_id,
                     ],
                     [
                         'stock_quantity' => (int)$stockStats->total_stock,
                     ]
                 );
             }
             
             // Set 0 for warehouses not in the batches but exist in warehouse_stocks
             if (empty($warehouseIds)) {
                 \App\Models\ProductWarehouseStock::where('product_id', $productId)
                    ->update(['stock_quantity' => 0]);
             } else {
                 \App\Models\ProductWarehouseStock::where('product_id', $productId)
                    ->whereNotIn('warehouse_id', $warehouseIds)
                    ->update(['stock_quantity' => 0]);
             }
        });
        
        $this->clearCache($productId);
    }

    /**
     * Handle management type change via Pipeline Pattern
     * 
     * @param int $productId
     * @param string $oldManagementType
     * @param string $newManagementType
     * @return void
     */
    protected function handleManagementTypeChangeViaPipeline(int $productId, string $oldManagementType, string $newManagementType): void
    {
        $payload = new \App\Pipelines\ProductManagementTypeChange\Payloads\ProductManagementTypeChangePayload(
            $productId,
            $oldManagementType,
            $newManagementType
        );
        
        $pipelineManager = app(\App\Pipelines\ProductManagementTypeChange\ProductManagementTypeChangePipelineManager::class);
        $pipelineManager->process($payload);
    }
    
    /**
     * Handle management type change (basic <-> batch) - DEPRECATED: Use handleManagementTypeChangeViaPipeline instead
     * 
     * @param int $productId
     * @param string $oldManagementType
     * @param string $newManagementType
     * @return void
     * @deprecated Use handleManagementTypeChangeViaPipeline instead
     */
    protected function handleManagementTypeChange(int $productId, string $oldManagementType, string $newManagementType): void
    {
        // Redirect to pipeline-based implementation
        $this->handleManagementTypeChangeViaPipeline($productId, $oldManagementType, $newManagementType);
    }

    /**
     * Convert product from basic management to batch management
     * Chuyển tất cả warehouse stocks vào batch DEFAULT
     * 
     * @param int $productId
     * @return void
     */
    protected function convertBasicToBatch(int $productId): void
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($productId) {
            // Lấy tất cả warehouse stocks hiện tại
            $warehouseStocks = $this->warehouseStockRepo->getModel()
                ->where('product_id', $productId)
                ->get();

            // Lấy hoặc tạo batch DEFAULT
            $defaultBatch = $this->getOrCreateDefaultBatch($productId);

            // Chuyển stock từ warehouse stocks vào batch warehouses
            foreach ($warehouseStocks as $warehouseStock) {
                if ($warehouseStock->stock_quantity > 0 && $warehouseStock->warehouse_id) {
                    // Tìm hoặc tạo batch warehouse stock
                    $batchWarehouse = $this->batchWarehouseRepo->findByBatchAndWarehouse(
                        $defaultBatch->id,
                        $warehouseStock->warehouse_id
                    );

                    if ($batchWarehouse) {
                        // Cộng thêm vào stock hiện có
                        $this->batchWarehouseRepo->getModel()
                            ->where('id', $batchWarehouse->id)
                            ->increment('stock_quantity', $warehouseStock->stock_quantity);
                    } else {
                        // Tạo mới batch warehouse stock
                        $this->batchWarehouseRepo->getModel()->create([
                            'product_batch_id' => $defaultBatch->id,
                            'warehouse_id' => $warehouseStock->warehouse_id,
                            'stock_quantity' => $warehouseStock->stock_quantity,
                        ]);
                    }

                    // Ghi log cho batch stock
                    \App\Models\ProductBatchStockLog::create([
                        'product_batch_id' => $defaultBatch->id,
                        'product_id' => $productId,
                        'product_variant_id' => null,
                        'warehouse_id' => $warehouseStock->warehouse_id,
                        'before_stock' => $batchWarehouse ? $batchWarehouse->stock_quantity : 0,
                        'change_stock' => $warehouseStock->stock_quantity,
                        'after_stock' => ($batchWarehouse ? $batchWarehouse->stock_quantity : 0) + $warehouseStock->stock_quantity,
                        'reason' => 'Chuyển đổi từ quản lý thông thường sang quản lý theo lô',
                        'user_id' => Auth::id(),
                        'transaction_type' => 'adjust',
                    ]);

                    // Xóa warehouse stock (set về 0)
                    $this->warehouseStockRepo->getModel()
                        ->where('id', $warehouseStock->id)
                        ->update(['stock_quantity' => 0]);
                }
            }

            // Sync lại warehouse stock từ batch
            $this->syncWarehouseStockFromBatches($productId);
        });
    }

    /**
     * Convert product from batch management to basic management
     * Chuyển tất cả batch stocks về warehouse stock của chi nhánh chính
     * 
     * @param int $productId
     * @return void
     */
    protected function convertBatchToBasic(int $productId): void
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($productId) {
            // Lấy default warehouse (chi nhánh chính - code MAIN)
            $defaultWarehouseId = $this->getDefaultWarehouseId();
            if (!$defaultWarehouseId) {
                Log::warning('Cannot convert batch to basic: No default warehouse found', [
                    'product_id' => $productId
                ]);
                return;
            }

            // Lấy tất cả batch stocks
            $batchWarehouses = $this->batchWarehouseRepo->getModel()
                ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
                ->where('product_batches.product_id', $productId)
                ->whereNull('product_batches.product_variant_id')
                ->where('product_batches.status', 'active')
                ->select('product_batch_warehouses.*')
                ->get();

            // Tính tổng stock theo warehouse
            $warehouseStockTotals = [];
            foreach ($batchWarehouses as $batchWarehouse) {
                $warehouseId = $batchWarehouse->warehouse_id;
                if (!isset($warehouseStockTotals[$warehouseId])) {
                    $warehouseStockTotals[$warehouseId] = 0;
                }
                $warehouseStockTotals[$warehouseId] += $batchWarehouse->stock_quantity;
            }

            // Tính tổng stock tất cả các kho để chuyển về chi nhánh chính
            $totalStock = array_sum($warehouseStockTotals);

            if ($totalStock > 0) {
                // Lấy warehouse stock hiện tại của chi nhánh chính
                $mainWarehouseStock = $this->warehouseStockRepo->findByProductAndWarehouse(
                    $productId,
                    $defaultWarehouseId
                );

                $beforeStock = $mainWarehouseStock ? $mainWarehouseStock->stock_quantity : 0;
                $afterStock = $beforeStock + $totalStock;

                // Cập nhật warehouse stock của chi nhánh chính
                $this->warehouseStockRepo->updateOrCreateStock(
                    [
                        'product_id' => $productId,
                        'warehouse_id' => $defaultWarehouseId,
                    ],
                    [
                        'stock_quantity' => $afterStock,
                    ]
                );

                // Ghi log cho warehouse stock
                $this->warehouseStockLogRepo->create([
                    'product_id' => $productId,
                    'warehouse_id' => $defaultWarehouseId,
                    'before_stock' => $beforeStock,
                    'change_stock' => $totalStock,
                    'after_stock' => $afterStock,
                    'reason' => 'Chuyển đổi từ quản lý theo lô sang quản lý thông thường',
                    'transaction_type' => 'adjust',
                    'user_id' => Auth::id(),
                ]);

                // Xóa tất cả batch warehouse stocks (set về 0)
                foreach ($batchWarehouses as $batchWarehouse) {
                    $this->batchWarehouseRepo->getModel()
                        ->where('id', $batchWarehouse->id)
                        ->update(['stock_quantity' => 0]);

                    // Ghi log cho batch stock (trừ stock)
                    \App\Models\ProductBatchStockLog::create([
                        'product_batch_id' => $batchWarehouse->product_batch_id,
                        'product_id' => $productId,
                        'product_variant_id' => null,
                        'warehouse_id' => $batchWarehouse->warehouse_id,
                        'before_stock' => $batchWarehouse->stock_quantity,
                        'change_stock' => -$batchWarehouse->stock_quantity,
                        'after_stock' => 0,
                        'reason' => 'Chuyển đổi từ quản lý theo lô sang quản lý thông thường',
                        'user_id' => Auth::id(),
                        'transaction_type' => 'adjust',
                    ]);
                }
            }
        });
    }

    /**
     * Get or create default batch for product
     * 
     * @param int $productId
     * @return \App\Models\ProductBatch
     */
    protected function getOrCreateDefaultBatch(int $productId): \App\Models\ProductBatch
    {
        // Tìm batch DEFAULT hiện có
        $defaultBatch = \App\Models\ProductBatch::where('product_id', $productId)
            ->whereNull('product_variant_id')
            ->where('is_default', true)
            ->first();

        if ($defaultBatch) {
            return $defaultBatch;
        }

        // Nếu không có, đánh dấu tất cả batches khác không phải default
        \App\Models\ProductBatch::where('product_id', $productId)
            ->whereNull('product_variant_id')
            ->update(['is_default' => false]);

        // Tạo batch DEFAULT mới
        return \App\Models\ProductBatch::create([
            'product_id' => $productId,
            'product_variant_id' => null,
            'code' => 'DEFAULT',
            'is_default' => true,
            'status' => 'active',
        ]);
    }

    /**
     * Get default warehouse ID (chi nhánh chính - code MAIN)
     * 
     * @return int|null
     */
    protected function getDefaultWarehouseId(): ?int
    {
        return $this->warehouseService->getDefaultWarehouseId();
    }

    /**
     * Transfer warehouse stock for a basic product (not batch-managed)
     * 
     * @param int $productId
     * @param int $fromWarehouseId
     * @param int $toWarehouseId
     * @param int $quantity
     * @param string|null $reason
     * @return bool
     */
    public function transferWarehouseStock(int $productId, int $fromWarehouseId, int $toWarehouseId, int $quantity, ?string $reason = null): bool
    {
        if ($fromWarehouseId === $toWarehouseId || $quantity <= 0) {
            return false;
        }

        try {
            $this->beginTransaction()
                ->setRequest(new Request())
                ->processWarehouseStockTransfer($productId, $fromWarehouseId, $toWarehouseId, $quantity, $reason)
                ->commit();
            
            // Clear cache
            $this->clearCache($productId);
            
            return true;
        } catch (\Throwable $th) {
            Log::error('Transfer warehouse stock failed: ', [
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
     * Process warehouse stock transfer
     * 
     * @param int $productId
     * @param int $fromWarehouseId
     * @param int $toWarehouseId
     * @param int $quantity
     * @param string|null $reason
     * @return static
     */
    protected function processWarehouseStockTransfer(int $productId, int $fromWarehouseId, int $toWarehouseId, int $quantity, ?string $reason = null): static
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($productId, $fromWarehouseId, $toWarehouseId, $quantity, $reason) {
            // Lấy stock hiện tại của kho nguồn
            $fromStock = $this->warehouseStockRepo->findByProductAndWarehouse($productId, $fromWarehouseId);
            if (!$fromStock || $fromStock->stock_quantity < $quantity) {
                throw new \Exception('Số lượng chuyển vượt quá tồn kho tại kho nguồn');
            }

            // Lấy stock hiện tại của kho đích
            $toStock = $this->warehouseStockRepo->findByProductAndWarehouse($productId, $toWarehouseId);

            $fromBeforeStock = (int) $fromStock->stock_quantity;
            $toBeforeStock = $toStock ? (int) $toStock->stock_quantity : 0;
            $fromAfterStock = $fromBeforeStock - $quantity;
            $toAfterStock = $toBeforeStock + $quantity;

            // Cập nhật stock kho nguồn (trừ)
            $this->warehouseStockRepo->updateOrCreateStock(
                [
                    'product_id' => $productId,
                    'warehouse_id' => $fromWarehouseId,
                ],
                [
                    'stock_quantity' => $fromAfterStock,
                    'storage_location' => $fromStock->storage_location,
                ]
            );

            // Cập nhật stock kho đích (cộng)
            $this->warehouseStockRepo->updateOrCreateStock(
                [
                    'product_id' => $productId,
                    'warehouse_id' => $toWarehouseId,
                ],
                [
                    'stock_quantity' => $toAfterStock,
                    'storage_location' => $toStock ? $toStock->storage_location : null,
                ]
            );

            // Ghi log cho kho nguồn (trừ)
            $this->warehouseStockLogRepo->create([
                'product_id' => $productId,
                'warehouse_id' => $fromWarehouseId,
                'before_stock' => $fromBeforeStock,
                'change_stock' => -$quantity,
                'after_stock' => $fromAfterStock,
                'reason' => ($reason ?: 'Chuyển kho') . ' → Kho #' . $toWarehouseId,
                'transaction_type' => 'transfer',
                'user_id' => Auth::id(),
            ]);

            // Ghi log cho kho đích (cộng)
            $this->warehouseStockLogRepo->create([
                'product_id' => $productId,
                'warehouse_id' => $toWarehouseId,
                'before_stock' => $toBeforeStock,
                'change_stock' => $quantity,
                'after_stock' => $toAfterStock,
                'reason' => ($reason ?: 'Chuyển kho') . ' ← Kho #' . $fromWarehouseId,
                'transaction_type' => 'transfer',
                'user_id' => Auth::id(),
            ]);
        });

        $this->result = true;
        return $this;
    }

    /**
     * Get products for promotion selection (with variants, formatted for frontend)
     * 
     * @param int $limit
     * @return array
     */
    public function getForPromotion(int $limit = 50): array
    {
        $products = $this->repository->getModel()
            ->where('publish', '2') // Only active products
            ->with(['variants' => function ($query) {
                $query->where('publish', '2'); // Only active variants
            }, 'languages' => function ($query) {
                $query->where('language_id', config('app.language_id', 1));
            }])
            ->orderBy('id', 'desc')
            ->limit($limit)
            ->get();

        return $products->map(function ($product) {
            return [
                'id' => $product->id,
                'name' => $product->languages->first()?->pivot?->name ?? $product->name ?? '',
                'sku' => $product->sku ?? '',
                'image' => $product->image ?? ($product->album[0] ?? null),
                'album' => $product->album ?? [],
                'retail_price' => $product->retail_price ?? 0,
                'wholesale_price' => $product->wholesale_price ?? 0,
                'price' => $product->retail_price ?? $product->wholesale_price ?? 0,
                'variants' => $product->variants->map(function ($variant) use ($product) {
                    return [
                        'id' => $variant->id,
                        'name' => $variant->name ?? '',
                        'sku' => $variant->sku ?? '',
                        'price' => $variant->retail_price ?? $variant->wholesale_price ?? 0,
                        'retail_price' => $variant->retail_price ?? 0,
                        'wholesale_price' => $variant->wholesale_price ?? 0,
                        'image' => $variant->image ?? $product->image ?? ($product->album[0] ?? null),
                        'attributes' => $variant->attributes ?? [],
                    ];
                })->toArray(),
            ];
        })->toArray();
    }
    public function getProductDetail(int $id, int $languageId)
    {
        // 1. Fetch Product with standard relations
        // We use repository model() to build query manually
        $product = $this->repository->model()
            ->select([
                'id', 
                'product_catalogue_id', 
                'product_brand_id', 
                'sku', 
                'barcode', 
                'image', 
                'album', 
                'price', 
                'retail_price', 
                'wholesale_price', 
                'publish'
            ])
            ->where('id', $id)
            ->where('publish', 2)
            ->with($this->with)
            ->firstOrFail();
        
        return $product;
    }
    public function getPromotionalProducts(int $limit = 5)
    {
        // 1. Get active product_discount promotions
        $activePromotions = \App\Models\Promotion::where('publish', 2) 
            ->where('type', 'product_discount')
            ->where(function ($q) {
                $q->where(function ($sub) {
                    $sub->whereNull('start_date')->orWhere('start_date', '<=', now());
                })->where(function ($sub) {
                    $sub->whereNull('end_date')->orWhere('end_date', '>=', now());
                });
            })
            ->with(['product_variants', 'product_catalogues'])
            ->get();

        if ($activePromotions->isEmpty()) {
            return collect([]);
        }

        $productIds = collect([]);

        foreach ($activePromotions as $promotion) {
            // Case 1: Direct Product/Variant assignment
            if ($promotion->apply_source === 'product_variant') {
                $ids = \Illuminate\Support\Facades\DB::table('promotion_product_variant')
                    ->where('promotion_id', $promotion->id)
                    ->pluck('product_id')
                    ->toArray();
                $productIds = $productIds->concat($ids);
            }
            
            // Case 2: Product Catalogue assignment
            if ($promotion->apply_source === 'product_catalogue') {
                $catalogueIds = $promotion->product_catalogues->pluck('id')->toArray();
                if (!empty($catalogueIds)) {
                     $ids = \Illuminate\Support\Facades\DB::table('product_catalogue_product')
                        ->whereIn('product_catalogue_id', $catalogueIds)
                        ->pluck('product_id')
                        ->toArray();
                     $productIds = $productIds->concat($ids);
                }
            }
        }

        $uniqueIds = $productIds->unique()->take($limit)->toArray();
        if (empty($uniqueIds)) {
            return collect([]);
        }

        $products = $this->repository->getModel()
            ->whereIn('id', $uniqueIds)
            ->where('publish', 2)
            ->with(['product_catalogues', 'current_languages', 'variants'])
            ->take($limit)
            ->get();

        $promotionPricingService = app(\App\Services\Impl\V1\Promotion\PromotionPricingService::class);
        $promotionPricingService->preloadForProducts($uniqueIds);

        foreach ($products as $product) {
            $priceInfo = $promotionPricingService->calculateFinalPrice($product, 1);
            $product->promotion_price = $priceInfo['final_price'];
            $product->original_price = $priceInfo['original_price'];
            $product->discount_percent = $priceInfo['discount_percent'];
            
            // Format image url accessor if needed, or just use image field
             $product->image_url = $product->image; 
        }

        return $products;
    }
}

