<?php  
namespace App\Services\Impl\V2\Product;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Product\ProductBatchServiceInterface;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use App\Repositories\Product\ProductBatchRepo;
use App\Repositories\Product\ProductBatchWarehouseRepo;
use App\Repositories\Product\ProductBatchStockLogRepo;
use App\Repositories\Warehouse\WarehouseRepo;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class ProductBatchService extends BaseCacheService implements ProductBatchServiceInterface {

    // Cache strategy: 'default' phù hợp cho product_batches
    protected string $cacheStrategy = 'default';
    protected string $module = 'product_batches';

    protected $repository;
    protected $batchWarehouseRepo;
    protected $batchStockLogRepo;
    protected $warehouseRepo;
    protected $productService;
    protected $variantService;
    protected $warehouseService;

    protected $with = ['warehouseStocks.warehouse', 'product', 'variant'];
    protected $simpleFilter = [];
    protected $searchFields = ['code'];
    protected $sort = ['is_default', 'desc'];

    public function __construct(
        ProductBatchRepo $repository,
        ProductBatchWarehouseRepo $batchWarehouseRepo,
        ProductBatchStockLogRepo $batchStockLogRepo,
        WarehouseRepo $warehouseRepo,
        ProductServiceInterface $productService,
        ProductVariantServiceInterface $variantService,
        WarehouseServiceInterface $warehouseService
    )
    {
        $this->repository = $repository;
        $this->batchWarehouseRepo = $batchWarehouseRepo;
        $this->batchStockLogRepo = $batchStockLogRepo;
        $this->warehouseRepo = $warehouseRepo;
        $this->productService = $productService;
        $this->variantService = $variantService;
        $this->warehouseService = $warehouseService;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        return $this;
    }

    /**
     * Format batch data for response
     */
    protected function formatBatchData($batch): array
    {
        $totalStock = $batch->warehouseStocks->sum('stock_quantity');
        $firstWarehouse = $batch->warehouseStocks->firstWhere('stock_quantity', '>', 0);
        
        $warehouseDistribution = $batch->warehouseStocks
            ->where('stock_quantity', '>', 0)
            ->map(function ($ws) {
                return [
                    'warehouse_id' => $ws->warehouse_id,
                    'warehouse_name' => $ws->warehouse?->name ?? 'Chưa xác định',
                    'stock_quantity' => (int) $ws->stock_quantity,
                ];
            })
            ->values();
        
        return [
            'id' => $batch->id,
            'code' => $batch->code,
            'manufactured_at' => $batch->manufactured_at?->format('Y-m-d'),
            'expired_at' => $batch->expired_at?->format('Y-m-d'),
            'warehouse_id' => $firstWarehouse?->warehouse_id,
            'warehouse_name' => $firstWarehouse?->warehouse?->name ?? null,
            'stock_quantity' => $totalStock,
            'warehouse_distribution' => $warehouseDistribution,
            'is_default' => (bool) $batch->is_default,
            'created_at' => $batch->created_at?->toIso8601String(),
        ];
    }

    /**
     * Get batches for a product
     */
    public function getBatchesForProduct(int $productId): array
    {
        $batches = $this->repository->getBatchesForProduct($productId);
        
        return $batches->map(function ($batch) {
            return $this->formatBatchData($batch);
        })->values()->toArray();
    }

    /**
     * Get batches for a variant
     */
    public function getBatchesForVariant(int $variantId): array
    {
        $batches = $this->repository->getBatchesForVariant($variantId);
        
        return $batches->map(function ($batch) {
            return $this->formatBatchData($batch);
        })->values()->toArray();
    }

    /**
     * Ensure default batch exists for a product
     */
    public function ensureDefaultBatchForProduct(int $productId): array
    {
        $existing = $this->repository->findDefaultBatchForProduct($productId);

        if ($existing) {
            return ['id' => $existing->id];
        }

        $batch = DB::transaction(function () use ($productId) {
            $any = $this->repository->findAnyBatchForProduct($productId);
            
            if ($any) {
                $this->repository->unsetDefaultForProduct($productId);
                $any->is_default = true;
                $any->code = $any->code ?: 'DEFAULT';
                $any->save();
                return $any;
            }

            $this->repository->unsetDefaultForProduct($productId);

            return $this->repository->create([
                'product_id' => $productId,
                'product_variant_id' => null,
                'code' => 'DEFAULT',
                'is_default' => true,
                'status' => 'active',
            ]);
        });

        $this->productService->clearCache($productId);

        return ['id' => $batch->id];
    }

    /**
     * Ensure default batch exists for a variant
     */
    public function ensureDefaultBatchForVariant(int $variantId): array
    {
        $existing = $this->repository->findDefaultBatchForVariant($variantId);

        if ($existing) {
            return ['id' => $existing->id];
        }

        $batch = DB::transaction(function () use ($variantId) {
            $variant = $this->variantService->findById($variantId);
            
            $any = $this->repository->findAnyBatchForVariant($variantId);
            
            if ($any) {
                $this->repository->unsetDefaultForVariant($variantId);
                $any->is_default = true;
                $any->code = $any->code ?: 'DEFAULT';
                $any->save();
                return $any;
            }

            $this->repository->unsetDefaultForVariant($variantId);

            // Get default warehouse (kho chính): fallback to first warehouse
            // Logic giống V1: orderBy('id')->value('id')
            $defaultWarehouseId = $this->warehouseRepo->getModel()
                ->orderBy('id')
                ->value('id');
            
            if (!$variant->relationLoaded('warehouseStocks')) {
                $variant->load('warehouseStocks');
            }
            
            $initialStockQuantity = 0;
            if ($defaultWarehouseId) {
                $warehouseStock = $variant->warehouseStocks
                    ->firstWhere('warehouse_id', $defaultWarehouseId);
                if ($warehouseStock) {
                    $initialStockQuantity = (int) ($warehouseStock->stock_quantity ?? 0);
                } else {
                    $initialStockQuantity = (int) ($variant->stock_quantity ?? 0);
                }
            } else {
                $initialStockQuantity = (int) ($variant->stock_quantity ?? 0);
            }

            $batch = $this->repository->create([
                'product_id' => $variant->product_id,
                'product_variant_id' => $variant->id,
                'code' => 'DEFAULT',
                'is_default' => true,
                'status' => 'active',
            ]);

            if ($initialStockQuantity > 0 && $defaultWarehouseId) {
                $this->batchWarehouseRepo->create([
                    'product_batch_id' => $batch->id,
                    'warehouse_id' => $defaultWarehouseId,
                    'stock_quantity' => $initialStockQuantity,
                ]);
            }

            return $batch;
        });

        $this->variantService->clearCache($variantId);
        $this->productService->clearCache($batch->product_id);

        return ['id' => $batch->id];
    }

    /**
     * Store batches for a product
     */
    public function storeBatchesForProduct(Request $request, int $productId): bool
    {
        $items = $request->input('items', []);

        // Normalize codes - logic giống V1
        foreach ($items as $i => $row) {
            $items[$i]['code'] = trim((string) ($row['code'] ?? ''));
            if ($items[$i]['code'] === '') {
                throw ValidationException::withMessages([
                    "items.$i.code" => ['Mã lô là bắt buộc.'],
                ]);
            }
        }

        DB::transaction(function () use ($productId, $items) {
            foreach ($items as $row) {
                $code = trim((string) ($row['code'] ?? ''));

                $batch = $this->repository->updateOrCreateForProduct(
                    $productId,
                    ['code' => $code],
                    [
                        'manufactured_at' => $row['manufactured_at'] ?? null,
                        'expired_at' => $row['expired_at'] ?? null,
                        'status' => 'active',
                    ]
                );

                if (isset($row['warehouse_id']) && $row['warehouse_id']) {
                    $stockQuantity = (int) ($row['stock_quantity'] ?? 0);
                    $this->batchWarehouseRepo->updateOrCreateStock(
                        [
                            'product_batch_id' => $batch->id,
                            'warehouse_id' => $row['warehouse_id'],
                        ],
                        [
                            'stock_quantity' => $stockQuantity,
                        ]
                    );
                }
            }
        });

        $this->productService->clearCache($productId);

        return true;
    }

    /**
     * Store batches for a variant
     */
    public function storeBatchesForVariant(Request $request, int $variantId): bool
    {
        $variant = $this->variantService->findById($variantId);
        $items = $request->input('items', []);

        // Normalize codes - logic giống V1
        foreach ($items as $i => $row) {
            $items[$i]['code'] = trim((string) ($row['code'] ?? ''));
            if ($items[$i]['code'] === '') {
                throw ValidationException::withMessages([
                    "items.$i.code" => ['Mã lô là bắt buộc.'],
                ]);
            }
        }

        DB::transaction(function () use ($variant, $items) {
            foreach ($items as $row) {
                $code = trim((string) ($row['code'] ?? ''));

                $batch = $this->repository->updateOrCreateForVariant(
                    $variant->id,
                    $variant->product_id,
                    ['code' => $code],
                    [
                        'manufactured_at' => $row['manufactured_at'] ?? null,
                        'expired_at' => $row['expired_at'] ?? null,
                        'status' => 'active',
                    ]
                );

                if (isset($row['warehouse_id']) && $row['warehouse_id']) {
                    $stockQuantity = (int) ($row['stock_quantity'] ?? 0);
                    $this->batchWarehouseRepo->updateOrCreateStock(
                        [
                            'product_batch_id' => $batch->id,
                            'warehouse_id' => $row['warehouse_id'],
                        ],
                        [
                            'stock_quantity' => $stockQuantity,
                        ]
                    );
                }
            }
        });

        $this->variantService->clearCache($variantId);
        $this->productService->clearCache($variant->product_id);

        return true;
    }

    /**
     * Update batch stock
     */
    public function updateBatchStock(Request $request, int $batchId): bool
    {
        $batch = $this->repository->findById($batchId);
        $payload = $request->all();

        DB::transaction(function () use ($batch, $payload) {
            if (array_key_exists('is_default', $payload) && (bool) $payload['is_default']) {
                if ($batch->product_variant_id) {
                    $this->repository->unsetDefaultForVariant($batch->product_variant_id);
                } else {
                    $this->repository->unsetDefaultForProduct($batch->product_id);
                }
            }
            
            $this->repository->update($batch->id, [
                'manufactured_at' => $payload['manufactured_at'] ?? $batch->manufactured_at,
                'expired_at' => $payload['expired_at'] ?? $batch->expired_at,
                'is_default' => array_key_exists('is_default', $payload) ? $payload['is_default'] : $batch->is_default,
            ]);

            if (array_key_exists('stock_quantity', $payload) && isset($payload['warehouse_id'])) {
                $warehouseId = (int) $payload['warehouse_id'];
                $afterStock = (int) $payload['stock_quantity'];
                
                // Logic giống V1: firstOrNew rồi save
                $batchWarehouseModel = $this->batchWarehouseRepo->getModel();
                $batchWarehouse = $batchWarehouseModel->firstOrNew([
                    'product_batch_id' => $batch->id,
                    'warehouse_id' => $warehouseId,
                ]);
                $beforeStock = (int) ($batchWarehouse->stock_quantity ?? 0);
                
                // Cập nhật số lượng
                $batchWarehouse->stock_quantity = $afterStock;
                $batchWarehouse->save();
                
                $delta = $afterStock - $beforeStock;
                if ($delta !== 0) {
                    $this->batchStockLogRepo->create([
                        'product_batch_id' => $batch->id,
                        'product_id' => $batch->product_id,
                        'product_variant_id' => $batch->product_variant_id,
                        'warehouse_id' => $warehouseId,
                        'before_stock' => $beforeStock,
                        'change_stock' => $delta,
                        'after_stock' => $afterStock,
                        'reason' => $payload['reason'] ?? null,
                        'user_id' => Auth::id(),
                        'transaction_type' => $batch->product_variant_id ? 'variant' : 'product',
                    ]);
                }
            }
        });

        // Refresh batch to get updated data
        $batch = $this->repository->findById($batchId);

        if ($batch->product_variant_id) {
            $this->variantService->syncWarehouseStockFromBatches($batch->product_variant_id);
            $this->variantService->clearCache($batch->product_variant_id);
        } else {
            $this->productService->syncWarehouseStockFromBatches($batch->product_id);
        }
        $this->productService->clearCache($batch->product_id);

        return true;
    }

    /**
     * Transfer stock between warehouses
     */
    public function transferStock(Request $request, int $batchId): array
    {
        $batch = $this->repository->findById($batchId);
        $fromWarehouseId = $request->input('from_warehouse_id') ? (int) $request->input('from_warehouse_id') : null;
        $toWarehouseId = (int) $request->input('to_warehouse_id');
        $quantity = (int) $request->input('quantity');
        $reason = $request->input('reason', 'Chuyển kho');

        if ($fromWarehouseId && $fromWarehouseId == $toWarehouseId) {
            throw new \Exception('Không thể chuyển đến cùng kho.');
        }

        try {
            DB::transaction(function () use ($batch, $fromWarehouseId, $toWarehouseId, $quantity, $reason) {
                $sourceBatch = $this->repository->lockForUpdate($batch->id);
                
                if (!$fromWarehouseId) {
                    $firstWarehouseStock = $this->batchWarehouseRepo->findFirstWithStock($batch->id);
                    if (!$firstWarehouseStock) {
                        throw new \Exception('Không tìm thấy kho có số lượng để chuyển.');
                    }
                    $fromWarehouseId = $firstWarehouseStock->warehouse_id;
                }
                
                if ($fromWarehouseId == $toWarehouseId) {
                    throw new \Exception('Không thể chuyển đến cùng kho.');
                }

                $sourceBatchWarehouse = $this->batchWarehouseRepo->lockAndFind($batch->id, $fromWarehouseId);
                
                if (!$sourceBatchWarehouse || $sourceBatchWarehouse->stock_quantity < $quantity) {
                    throw new \Exception('Số lượng tồn kho không đủ để chuyển.');
                }

                $targetBatchWarehouse = $this->batchWarehouseRepo->lockAndFindOrNew($batch->id, $toWarehouseId);

                $sourceBeforeStock = (int) $sourceBatchWarehouse->stock_quantity;
                $targetBeforeStock = (int) ($targetBatchWarehouse->stock_quantity ?? 0);

                $sourceBatchWarehouse->stock_quantity = $sourceBeforeStock - $quantity;
                $sourceBatchWarehouse->save();

                $targetBatchWarehouse->stock_quantity = $targetBeforeStock + $quantity;
                $targetBatchWarehouse->save();

                $this->batchStockLogRepo->create([
                    'product_batch_id' => $batch->id,
                    'product_id' => $batch->product_id,
                    'product_variant_id' => $batch->product_variant_id,
                    'warehouse_id' => $fromWarehouseId,
                    'before_stock' => $sourceBeforeStock,
                    'change_stock' => -$quantity,
                    'after_stock' => $sourceBatchWarehouse->stock_quantity,
                    'reason' => $reason . ' → Kho #' . $toWarehouseId,
                    'user_id' => Auth::id(),
                    'transaction_type' => 'transfer',
                ]);

                $this->batchStockLogRepo->create([
                    'product_batch_id' => $batch->id,
                    'product_id' => $batch->product_id,
                    'product_variant_id' => $batch->product_variant_id,
                    'warehouse_id' => $toWarehouseId,
                    'before_stock' => $targetBeforeStock,
                    'change_stock' => $quantity,
                    'after_stock' => $targetBatchWarehouse->stock_quantity,
                    'reason' => $reason . ' ← Kho #' . $fromWarehouseId,
                    'user_id' => Auth::id(),
                    'transaction_type' => 'transfer',
                ]);

                if ($batch->product_variant_id) {
                    $this->variantService->syncWarehouseStockFromBatches($batch->product_variant_id);
                    $this->variantService->clearCache($batch->product_variant_id);
                } else {
                    $this->productService->syncWarehouseStockFromBatches($batch->product_id);
                }
                $this->productService->clearCache($batch->product_id);
            });

            return [
                'success' => true,
                'message' => 'Chuyển kho thành công.',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage() ?: 'Có lỗi xảy ra khi chuyển kho.',
            ];
        }
    }

    /**
     * Get batch detail with logs
     */
    public function getBatchDetail(int $batchId, Request $request): array
    {
        $batch = $this->repository->findById($batchId, ['warehouseStocks.warehouse', 'product.current_languages']);
        
        // Logic giống V1: orderBy('name')->get(['id', 'name']) rồi map
        $warehouses = $this->warehouseRepo->getModel()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($w) => ['value' => (string) $w->id, 'label' => $w->name])
            ->values();

        $isVariantBatch = !is_null($batch->product_variant_id);
        $defaultTransactionTypes = $isVariantBatch 
            ? ['variant', 'transfer', 'import', 'export', 'return', 'adjust'] 
            : ['product', 'transfer', 'import', 'export', 'return', 'adjust'];

        $transactionTypes = $request->input('transaction_types', []);
        $filters = [
            'transaction_types' => is_array($transactionTypes) && count($transactionTypes) > 0 ? $transactionTypes : $defaultTransactionTypes,
            'per_page' => (int) $request->input('perpage', 20),
            'page' => (int) $request->input('page', 1),
        ];

        if ($request->has('created_at.between')) {
            $dateRange = $request->input('created_at.between');
            if ($dateRange && is_string($dateRange)) {
                $dates = explode(',', $dateRange);
                if (count($dates) === 2) {
                    $filters['date_from'] = Carbon::parse(trim($dates[0]))->startOfDay();
                    $filters['date_to'] = Carbon::parse(trim($dates[1]))->endOfDay();
                }
            }
        }

        $logs = $this->batchStockLogRepo->getLogsForBatch($batchId, $filters);

        $productName = null;
        try {
            $productName = optional($batch->product?->current_languages?->first()?->pivot)->name;
        } catch (\Throwable $e) {
            $productName = null;
        }

        $variantName = null;
        if ($batch->product_variant_id) {
            $variant = $this->variantService->findById($batch->product_variant_id);
            $variantName = $variant?->name;
        }

        $totalStock = $batch->warehouseStocks->sum('stock_quantity');
        $warehouseDistribution = $batch->warehouseStocks->map(function ($bw) {
            return [
                'warehouse_id' => $bw->warehouse_id,
                'warehouse_name' => $bw->warehouse?->name ?? 'Chưa xác định',
                'stock_quantity' => (int) ($bw->stock_quantity ?? 0),
                'batch_id' => $bw->product_batch_id,
            ];
        })->values();

        $firstWarehouse = $batch->warehouseStocks->firstWhere('stock_quantity', '>', 0);

        $logsData = $logs->map(function ($l) {
            $transferInfo = null;
            if ($l->transaction_type === 'transfer' && $l->reason) {
                if (str_contains($l->reason, '→')) {
                    preg_match('/→ Kho #(\d+)/', $l->reason, $matches);
                    if (isset($matches[1])) {
                        $toWarehouseId = (int) $matches[1];
                        $toWarehouse = $this->warehouseRepo->findById($toWarehouseId);
                        $transferInfo = [
                            'type' => 'out',
                            'from_warehouse_id' => $l->warehouse_id,
                            'from_warehouse_name' => $l->warehouse?->name ?? 'N/A',
                            'to_warehouse_id' => $toWarehouseId,
                            'to_warehouse_name' => $toWarehouse?->name ?? 'N/A',
                        ];
                    }
                } elseif (str_contains($l->reason, '←')) {
                    preg_match('/← Kho #(\d+)/', $l->reason, $matches);
                    if (isset($matches[1])) {
                        $fromWarehouseId = (int) $matches[1];
                        $fromWarehouse = $this->warehouseRepo->findById($fromWarehouseId);
                        $transferInfo = [
                            'type' => 'in',
                            'from_warehouse_id' => $fromWarehouseId,
                            'from_warehouse_name' => $fromWarehouse?->name ?? 'N/A',
                            'to_warehouse_id' => $l->warehouse_id,
                            'to_warehouse_name' => $l->warehouse?->name ?? 'N/A',
                        ];
                    }
                }
            }

            return [
                'id' => $l->id,
                'change_stock' => (int) $l->change_stock,
                'before_stock' => (int) $l->before_stock,
                'after_stock' => (int) $l->after_stock,
                'reason' => $l->reason,
                'transaction_type' => $l->transaction_type ?? 'product',
                'warehouse_id' => $l->warehouse_id,
                'warehouse_name' => $l->warehouse?->name ?? null,
                'transfer_info' => $transferInfo,
                'created_at' => $l->created_at?->format('d/m/Y H:i'),
                'user' => $l->user ? [
                    'id' => $l->user->id,
                    'name' => $l->user->name,
                    'email' => $l->user->email,
                ] : null,
            ];
        })->values();

        return [
            'batch' => [
                'id' => $batch->id,
                'code' => $batch->code,
                'product_id' => $batch->product_id,
                'product_variant_id' => $batch->product_variant_id,
                'product_name' => $productName,
                'variant_name' => $variantName,
                'manufactured_at' => $batch->manufactured_at?->format('Y-m-d'),
                'expired_at' => $batch->expired_at?->format('Y-m-d'),
                'warehouse_id' => $firstWarehouse?->warehouse_id,
                'stock_quantity' => $firstWarehouse?->stock_quantity ?? 0,
                'total_stock' => $totalStock,
                'warehouse_distribution' => $warehouseDistribution,
                'is_default' => (bool) $batch->is_default,
                'created_at' => $batch->created_at?->format('d/m/Y H:i'),
                'is_variant_batch' => !is_null($batch->product_variant_id),
            ],
            'warehouses' => $warehouses,
            'logs' => [
                'data' => $logsData,
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
            ],
            'request' => array_merge(
                $request->only(['transaction_types', 'created_at', 'perpage', 'page']),
                ['default_transaction_types' => $defaultTransactionTypes]
            ),
        ];
    }

    /**
     * Clear cache for product/variant
     */
    public function clearCache(int $productId, ?int $variantId = null): void
    {
        if ($variantId) {
            $this->variantService->clearCache($variantId);
        }
        $this->productService->clearCache($productId);
    }
}
