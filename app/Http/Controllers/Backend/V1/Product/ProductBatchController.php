<?php

namespace App\Http\Controllers\Backend\V1\Product;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductBatch;
use App\Models\ProductBatchWarehouse;
use App\Models\ProductBatchStockLog;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;

class ProductBatchController extends Controller
{
    protected $productService;
    protected $variantService;

    public function __construct(
        ProductServiceInterface $productService,
        ProductVariantServiceInterface $variantService
    ) {
        $this->productService = $productService;
        $this->variantService = $variantService;
    }
    /**
     * Lấy danh sách lô sản phẩm
     *
     * @param Product $product
     * @return JsonResponse
     */
    public function index(Product $product): JsonResponse
    {
        $items = ProductBatch::query()
            ->where('product_id', $product->id)
            ->whereNull('product_variant_id')
            ->with('warehouseStocks.warehouse')
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get()
            ->map(function (ProductBatch $b) {
                $totalStock = $b->warehouseStocks->sum('stock_quantity');
                $firstWarehouse = $b->warehouseStocks->firstWhere('stock_quantity', '>', 0);
                
                $warehouseDistribution = $b->warehouseStocks
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
                    'id' => $b->id,
                    'code' => $b->code,
                    'manufactured_at' => $b->manufactured_at?->format('Y-m-d'),
                    'expired_at' => $b->expired_at?->format('Y-m-d'),
                    'warehouse_id' => $firstWarehouse?->warehouse_id,
                    'warehouse_name' => $firstWarehouse?->warehouse?->name ?? null,
                    'stock_quantity' => $totalStock,
                    'warehouse_distribution' => $warehouseDistribution,
                    'is_default' => (bool) $b->is_default,
                    'created_at' => $b->created_at?->toIso8601String(),
                ];
            })
            ->values();

        return response()->json(['data' => $items]);
    }

    /**
     * Get batches for a variant
     */
    public function indexVariant(ProductVariant $variant): JsonResponse
    {
        $items = ProductBatch::query()
            ->where('product_variant_id', $variant->id)
            ->with('warehouseStocks.warehouse')
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get()
            ->map(function (ProductBatch $b) {
                $totalStock = $b->warehouseStocks->sum('stock_quantity');
                $firstWarehouse = $b->warehouseStocks->firstWhere('stock_quantity', '>', 0);
                
                $warehouseDistribution = $b->warehouseStocks
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
                    'id' => $b->id,
                    'code' => $b->code,
                    'manufactured_at' => $b->manufactured_at?->format('Y-m-d'),
                    'expired_at' => $b->expired_at?->format('Y-m-d'),
                    'warehouse_id' => $firstWarehouse?->warehouse_id,
                    'warehouse_name' => $firstWarehouse?->warehouse?->name ?? null,
                    'stock_quantity' => $totalStock,
                    'warehouse_distribution' => $warehouseDistribution,
                    'is_default' => (bool) $b->is_default,
                    'created_at' => $b->created_at?->toIso8601String(),
                ];
            })
            ->values();

        return response()->json(['data' => $items]);
    }

    /**
     * Đảm bảo có lô mặc định cho sản phẩm
     *
     * @param Product $product
     * @return JsonResponse
     */
    public function ensureDefault(Product $product): JsonResponse
    {
        $existing = ProductBatch::query()
            ->where('product_id', $product->id)
            ->whereNull('product_variant_id')
            ->where('is_default', true)
            ->first();

        if ($existing) {
            return response()->json(['data' => ['id' => $existing->id]]);
        }

        $batch = DB::transaction(function () use ($product) {
            $any = ProductBatch::query()
                ->where('product_id', $product->id)
                ->whereNull('product_variant_id')
                ->first();
            if ($any) {
                ProductBatch::query()
                    ->where('product_id', $product->id)
                    ->whereNull('product_variant_id')
                    ->update(['is_default' => false]);
                $any->is_default = true;
                $any->code = $any->code ?: 'DEFAULT';
                $any->save();
                return $any;
            }

            ProductBatch::query()
                ->where('product_id', $product->id)
                ->whereNull('product_variant_id')
                ->update(['is_default' => false]);

            return ProductBatch::create([
                'product_id' => $product->id,
                'product_variant_id' => null,
                'code' => 'DEFAULT',
                'is_default' => true,
                'status' => 'active',
            ]);
        });

        $this->productService->clearCache($product->id);

        return response()->json(['data' => ['id' => $batch->id]]);
    }

    /**
     * Đảm bảo có lô mặc định cho biến thể sản phẩm
     *
     * @param ProductVariant $variant
     * @return JsonResponse
     */
    public function ensureDefaultVariant(ProductVariant $variant): JsonResponse
    {
        $existing = ProductBatch::query()
            ->where('product_variant_id', $variant->id)
            ->where('is_default', true)
            ->first();

        if ($existing) {
            return response()->json(['data' => ['id' => $existing->id]]);
        }

        $batch = DB::transaction(function () use ($variant) {
            $any = ProductBatch::query()
                ->where('product_variant_id', $variant->id)
                ->first();
            if ($any) {
                ProductBatch::query()
                    ->where('product_variant_id', $variant->id)
                    ->update(['is_default' => false]);
                $any->is_default = true;
                $any->code = $any->code ?: 'DEFAULT';
                $any->save();
                return $any;
            }

            ProductBatch::query()
                ->where('product_variant_id', $variant->id)
                ->update(['is_default' => false]);

            $defaultWarehouseId = Warehouse::query()->orderBy('id')->value('id');
            
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

            $batch = ProductBatch::create([
                'product_id' => $variant->product_id,
                'product_variant_id' => $variant->id,
                'code' => 'DEFAULT',
                'is_default' => true,
                'status' => 'active',
            ]);

            if ($initialStockQuantity > 0 && $defaultWarehouseId) {
                \App\Models\ProductBatchWarehouse::create([
                    'product_batch_id' => $batch->id,
                    'warehouse_id' => $defaultWarehouseId,
                    'stock_quantity' => $initialStockQuantity,
                ]);
            }

            return $batch;
        });

        $this->variantService->clearCache($variant->id);
        $this->productService->clearCache($variant->product_id);

        return response()->json(['data' => ['id' => $batch->id]]);
    }

    /**
     * Lưu danh sách lô sản phẩm
     *
     * @param Request $request
     * @param Product $product
     * @return JsonResponse
     */
    public function store(Request $request, Product $product): JsonResponse
    {
        $payload = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.code' => ['required', 'string', 'max:255'],
            'items.*.manufactured_at' => ['nullable', 'date'],
            'items.*.expired_at' => ['nullable', 'date'],
            'items.*.warehouse_id' => ['nullable', 'integer'],
            'items.*.stock_quantity' => ['nullable', 'integer', 'min:0'],
        ]);

        $items = $payload['items'] ?? [];

        foreach ($items as $i => $row) {
            $items[$i]['code'] = trim((string) ($row['code'] ?? ''));
            if ($items[$i]['code'] === '') {
                throw ValidationException::withMessages([
                    "items.$i.code" => ['Mã lô là bắt buộc.'],
                ]);
            }
        }

        DB::transaction(function () use ($product, $items) {
            foreach ($items as $row) {
                $batch = ProductBatch::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'product_variant_id' => null,
                        'code' => $row['code']
                    ],
                    [
                        'manufactured_at' => $row['manufactured_at'] ?? null,
                        'expired_at' => $row['expired_at'] ?? null,
                        'status' => 'active',
                    ]
                );

                if (isset($row['warehouse_id']) && $row['warehouse_id']) {
                    $stockQuantity = (int) ($row['stock_quantity'] ?? 0);
                    \App\Models\ProductBatchWarehouse::updateOrCreate(
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

        $this->productService->clearCache($product->id);

        return response()->json(['success' => true]);
    }

    /**
     * Lưu danh sách lô cho biến thể sản phẩm
     *
     * @param Request $request
     * @param ProductVariant $variant
     * @return JsonResponse
     */
    public function storeVariant(Request $request, ProductVariant $variant): JsonResponse
    {
        $payload = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.code' => ['required', 'string', 'max:255'],
            'items.*.manufactured_at' => ['nullable', 'date'],
            'items.*.expired_at' => ['nullable', 'date'],
            'items.*.warehouse_id' => ['nullable', 'integer'],
            'items.*.stock_quantity' => ['nullable', 'integer', 'min:0'],
        ]);

        $items = $payload['items'] ?? [];

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
                $batch = ProductBatch::updateOrCreate(
                    [
                        'product_variant_id' => $variant->id,
                        'code' => $row['code']
                    ],
                    [
                        'product_id' => $variant->product_id,
                        'manufactured_at' => $row['manufactured_at'] ?? null,
                        'expired_at' => $row['expired_at'] ?? null,
                        'status' => 'active',
                    ]
                );

                if (isset($row['warehouse_id']) && $row['warehouse_id']) {
                    $stockQuantity = (int) ($row['stock_quantity'] ?? 0);
                    \App\Models\ProductBatchWarehouse::updateOrCreate(
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

        $this->variantService->clearCache($variant->id);
        $this->productService->clearCache($variant->product_id);

        return response()->json(['success' => true]);
    }

    /**
     * Cập nhật thông tin lô sản phẩm
     *
     * @param Request $request
     * @param ProductBatch $batch
     * @return JsonResponse
     */
    public function update(Request $request, ProductBatch $batch): JsonResponse
    {
        $payload = $request->validate([
            'manufactured_at' => ['nullable', 'date'],
            'expired_at' => ['nullable', 'date'],
            'warehouse_id' => ['nullable', 'integer'], // Cần để biết cập nhật kho nào
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'is_default' => ['nullable', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($batch, $payload) {
            if (array_key_exists('is_default', $payload) && (bool) $payload['is_default']) {
                if ($batch->product_variant_id) {
                    ProductBatch::query()
                        ->where('product_variant_id', $batch->product_variant_id)
                        ->update(['is_default' => false]);
                } else {
                    ProductBatch::query()
                        ->where('product_id', $batch->product_id)
                        ->whereNull('product_variant_id')
                        ->update(['is_default' => false]);
                }
            }
            
            $batch->fill([
                'manufactured_at' => $payload['manufactured_at'] ?? $batch->manufactured_at,
                'expired_at' => $payload['expired_at'] ?? $batch->expired_at,
                'is_default' => array_key_exists('is_default', $payload) ? $payload['is_default'] : $batch->is_default,
            ]);
            $batch->save();

            if (array_key_exists('stock_quantity', $payload) && isset($payload['warehouse_id'])) {
                $warehouseId = (int) $payload['warehouse_id'];
                $afterStock = (int) $payload['stock_quantity'];
                
                $batchWarehouse = \App\Models\ProductBatchWarehouse::firstOrNew([
                    'product_batch_id' => $batch->id,
                    'warehouse_id' => $warehouseId,
                ]);
                $beforeStock = (int) ($batchWarehouse->stock_quantity ?? 0);
                
                $batchWarehouse->stock_quantity = $afterStock;
                $batchWarehouse->save();
                
                $delta = $afterStock - $beforeStock;
                if ($delta !== 0) {
                    ProductBatchStockLog::create([
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

        if ($batch->product_variant_id) {
            $this->variantService->syncWarehouseStockFromBatches($batch->product_variant_id);
            $this->variantService->clearCache($batch->product_variant_id);
        } else {
            $this->productService->syncWarehouseStockFromBatches($batch->product_id);
        }
        $this->productService->clearCache($batch->product_id);

        return response()->json(['success' => true]);
    }

    /**
     * Hiển thị chi tiết lô sản phẩm
     *
     * @param Request $request
     * @param ProductBatch $batch
     * @return Response
     */
    public function detail(Request $request, ProductBatch $batch): Response
    {
        if ($batch->product_id) {
            try {
                $batch->load(['product.current_languages']);
            } catch (\Exception $e) {
            }
        }
        $warehouses = Warehouse::query()->orderBy('name')->get(['id', 'name']);

        $query = ProductBatchStockLog::query()
            ->where('product_batch_id', $batch->id)
            ->with('user:id,name,email')
            ->with('warehouse:id,name');

        $isVariantBatch = !is_null($batch->product_variant_id);
        $defaultTransactionTypes = $isVariantBatch 
            ? ['variant', 'transfer', 'import', 'export', 'return', 'adjust'] 
            : ['product', 'transfer', 'import', 'export', 'return', 'adjust'];

        $transactionTypes = $request->input('transaction_types', []);
        if (is_array($transactionTypes) && count($transactionTypes) > 0) {
            $query->whereIn('transaction_type', $transactionTypes);
        } else {
            $query->whereIn('transaction_type', $defaultTransactionTypes);
        }

        if ($request->has('created_at.between')) {
            $dateRange = $request->input('created_at.between');
            if ($dateRange && is_string($dateRange)) {
                $dates = explode(',', $dateRange);
                if (count($dates) === 2) {
                    $startDate = Carbon::parse(trim($dates[0]))->startOfDay();
                    $endDate = Carbon::parse(trim($dates[1]))->endOfDay();
                    $query->whereBetween('created_at', [$startDate, $endDate]);
                }
            }
        }

        $perPage = (int) $request->input('perpage', 20);
        $page = (int) $request->input('page', 1);
        
        $logs = $query->orderByDesc('id')->paginate($perPage, ['*'], 'page', $page);

        $productName = null;
        try {
            $productName = optional($batch->product?->current_languages?->first()?->pivot)->name;
        } catch (\Throwable $e) {
            $productName = null;
        }

        $variantName = null;
        if ($batch->product_variant_id) {
            $variant = ProductVariant::find($batch->product_variant_id);
            $variantName = $variant?->name;
        }

        $batch->load('warehouseStocks.warehouse');
        
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

        return Inertia::render('backend/product/batch/show', [
            'batch' => [
                'id' => $batch->id,
                'code' => $batch->code,
                'product_id' => $batch->product_id,
                'product_variant_id' => $batch->product_variant_id,
                'product_name' => $productName,
                'variant_name' => $variantName,
                'manufactured_at' => $batch->manufactured_at?->format('Y-m-d'),
                'expired_at' => $batch->expired_at?->format('Y-m-d'),
                'warehouse_id' => $firstWarehouse?->warehouse_id, // Giữ lại để tương thích với frontend
                'stock_quantity' => $firstWarehouse?->stock_quantity ?? 0, // Số lượng ở kho đầu tiên (tương thích)
                'total_stock' => $totalStock, // Tổng số lượng ở tất cả các kho
                'warehouse_distribution' => $warehouseDistribution, // Phân bổ số lượng theo từng kho
                'is_default' => (bool) $batch->is_default,
                'created_at' => $batch->created_at?->format('d/m/Y H:i'),
                'is_variant_batch' => !is_null($batch->product_variant_id),
            ],
            'warehouses' => $warehouses->map(fn ($w) => ['value' => (string) $w->id, 'label' => $w->name])->values(),
            'logs' => [
                'data' => $logs->map(function (ProductBatchStockLog $l) {
                    $transferInfo = null;
                    if ($l->transaction_type === 'transfer' && $l->reason) {
                        if (str_contains($l->reason, '→')) {
                            preg_match('/→ Kho #(\d+)/', $l->reason, $matches);
                            if (isset($matches[1])) {
                                $toWarehouseId = (int) $matches[1];
                                $toWarehouse = Warehouse::find($toWarehouseId);
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
                                $fromWarehouse = Warehouse::find($fromWarehouseId);
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
                })->values(),
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
        ]);
    }

    /**
     * Chuyển tồn kho lô giữa các kho
     *
     * @param Request $request
     * @param ProductBatch $batch
     * @return JsonResponse
     */
    public function transfer(Request $request, ProductBatch $batch): JsonResponse
    {
        $payload = $request->validate([
            'from_warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'to_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $fromWarehouseId = isset($payload['from_warehouse_id']) ? (int) $payload['from_warehouse_id'] : null;
        $toWarehouseId = (int) $payload['to_warehouse_id'];
        $quantity = (int) $payload['quantity'];
        $reason = $payload['reason'] ?? 'Chuyển kho';

        if ($fromWarehouseId && $fromWarehouseId == $toWarehouseId) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể chuyển đến cùng kho.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($batch, $fromWarehouseId, $toWarehouseId, $quantity, $reason) {
                $sourceBatch = ProductBatch::lockForUpdate()->findOrFail($batch->id);
                
                if (!$fromWarehouseId) {
                    $firstWarehouseStock = \App\Models\ProductBatchWarehouse::where('product_batch_id', $batch->id)
                        ->where('stock_quantity', '>', 0)
                        ->orderBy('id')
                        ->first();
                    if (!$firstWarehouseStock) {
                        throw new \Exception('Không tìm thấy kho có số lượng để chuyển.');
                    }
                    $fromWarehouseId = $firstWarehouseStock->warehouse_id;
                }
                
                if ($fromWarehouseId == $toWarehouseId) {
                    throw new \Exception('Không thể chuyển đến cùng kho.');
                }

                $sourceBatchWarehouse = \App\Models\ProductBatchWarehouse::lockForUpdate()
                    ->where('product_batch_id', $batch->id)
                    ->where('warehouse_id', $fromWarehouseId)
                    ->first();
                
                if (!$sourceBatchWarehouse || $sourceBatchWarehouse->stock_quantity < $quantity) {
                    throw new \Exception('Số lượng tồn kho không đủ để chuyển.');
                }

                $targetBatchWarehouse = \App\Models\ProductBatchWarehouse::lockForUpdate()
                    ->firstOrNew([
                        'product_batch_id' => $batch->id,
                        'warehouse_id' => $toWarehouseId,
                    ]);

                $sourceBeforeStock = (int) $sourceBatchWarehouse->stock_quantity;
                $targetBeforeStock = (int) ($targetBatchWarehouse->stock_quantity ?? 0);

                $sourceBatchWarehouse->stock_quantity = $sourceBeforeStock - $quantity;
                $sourceBatchWarehouse->save();

                $targetBatchWarehouse->stock_quantity = $targetBeforeStock + $quantity;
                $targetBatchWarehouse->save();

                ProductBatchStockLog::create([
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

                ProductBatchStockLog::create([
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

            return response()->json([
                'success' => true,
                'message' => 'Chuyển kho thành công.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Có lỗi xảy ra khi chuyển kho.',
            ], 422);
        }
    }

    /**
     * Xóa lô sản phẩm
     *
     * @param ProductBatch $batch
     * @return JsonResponse
     */
    public function destroy(ProductBatch $batch): JsonResponse
    {
        if ($batch->is_default) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xoá lô mặc định.',
            ], 422);
        }

        $productId = $batch->product_id;
        $variantId = $batch->product_variant_id;
        
        $batch->delete();

        if ($variantId) {
            $this->variantService->clearCache($variantId);
        }
        $this->productService->clearCache($productId);

        return response()->json(['success' => true]);
    }
}

