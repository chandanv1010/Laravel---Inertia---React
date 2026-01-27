<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class UpdateWarehouseStocksPipe extends AbstractImportOrderPipe
{
    protected ProductServiceInterface $productService;
    protected ProductVariantServiceInterface $variantService;
    
    public function __construct($service, ProductServiceInterface $productService, ProductVariantServiceInterface $variantService)
    {
        parent::__construct($service);
        $this->productService = $productService;
        $this->variantService = $variantService;
    }
    
    protected function getProductService(): ProductServiceInterface
    {
        return $this->productService;
    }
    
    protected function getVariantService(): ProductVariantServiceInterface
    {
        return $this->variantService;
    }
    
    public function handle(ImportOrderPayload $payload, \Closure $next): ImportOrderPayload
    {
        // Chỉ update stocks nếu:
        // - Tạo mới và import_to_stock = true
        // - Hoặc update từ pending -> completed (chưa nhập kho trước đó)
        if (!$payload->importToStock || !$payload->warehouseId) {
            return $next($payload);
        }
        
        $shouldUpdate = false;
        if ($payload->isNewOrder) {
            $shouldUpdate = true;
        } elseif ($payload->wasPending && $payload->isNowCompleted) {
            $shouldUpdate = true;
        } elseif ($payload->importToStock && $payload->isNowCompleted && !$payload->wasPending) {
            // Trường hợp tạo mới với import_to_stock = true: isNewOrder có thể false nhưng vẫn cần update
            // Điều kiện: importToStock = true, isNowCompleted = true, và !wasPending (không phải chuyển từ pending)
            $shouldUpdate = true;
        }
        
        if (!$shouldUpdate) {
            return $next($payload);
        }
        
        foreach ($payload->items as $item) {
            $quantity = (int) ($item['quantity'] ?? 0);
            if ($quantity <= 0) continue;
            
            $productId = $item['product_id'] ?? null;
            $variantId = $item['product_variant_id'] ?? null;
            
            // Lấy product để check management_type HIỆN TẠI
            $product = null;
            if ($variantId) {
                $variant = $this->getVariantService()->show($variantId);
                if ($variant && $variant->product_id) {
                    $product = $this->getProductService()->show($variant->product_id);
                }
            } elseif ($productId) {
                $product = $this->getProductService()->show($productId);
            }
            
            // Kiểm tra management_type HIỆN TẠI của sản phẩm
            $isCurrentlyBatch = $product && $product->management_type === 'batch';
            
            // Kiểm tra xem có batch_allocations không
            $batchAllocations = $item['batch_allocations'] ?? null;
            if (is_string($batchAllocations)) {
                $batchAllocations = json_decode($batchAllocations, true) ?? [];
            }
            $hasBatchAllocations = !empty($batchAllocations) && is_array($batchAllocations) && count($batchAllocations) > 0;
            
            // Nếu sản phẩm HIỆN TẠI là batch:
            // - Nếu có batch_allocations → để UpdateBatchStocksPipe xử lý
            // - Nếu không có batch_allocations → tự động tạo batch DEFAULT và phân bổ vào đó
            if ($isCurrentlyBatch) {
                if ($hasBatchAllocations) {
                    // Có batch_allocations → để UpdateBatchStocksPipe xử lý
                    continue;
                } else {
                    // Không có batch_allocations → tự động tạo batch DEFAULT và phân bổ
                    $this->handleAutoBatchAllocation($productId, $variantId, $payload->warehouseId, $quantity, $payload->orderCode);
                    continue; // Đã xử lý trong handleAutoBatchAllocation
                }
            }
            
            // Nếu sản phẩm HIỆN TẠI không phải batch:
            // - Bỏ qua batch_allocations (nếu có) vì sản phẩm đã chuyển từ batch -> basic
            // - Nhập vào warehouse stock trực tiếp
            if ($variantId) {
                $this->updateVariantWarehouseStock($variantId, $payload->warehouseId, $quantity, $payload->orderCode);
            } elseif ($productId) {
                $this->updateProductWarehouseStock($productId, $payload->warehouseId, $quantity, $payload->orderCode);
            }
        }
        
        return $next($payload);
    }
    
    protected function updateProductWarehouseStock(int $productId, int $warehouseId, int $quantity, string $orderCode): void
    {
        $warehouseStockRepo = $this->getWarehouseStockRepo();
        $warehouseStockLogRepo = $this->getWarehouseStockLogRepo();
        
        // Lock and get existing stock to prevent race conditions
        $existingStock = $warehouseStockRepo->getModel()
            ->lockForUpdate()
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->first();
        
        $beforeStock = $existingStock ? (int) $existingStock->stock_quantity : 0;
        $afterStock = $beforeStock + $quantity;
        
        // Update or create warehouse stock (already locked, safe to update)
        $warehouseStockRepo->updateOrCreateStock(
            [
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
            ],
            [
                'stock_quantity' => $afterStock,
            ]
        );
        
        // Create log
        $warehouseStockLogRepo->create([
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => $quantity,
            'after_stock' => $afterStock,
            'reason' => "Nhập hàng từ đơn nhập #{$orderCode}",
            'transaction_type' => 'import',
            'user_id' => Auth::id(),
        ]);
    }
    
    protected function updateVariantWarehouseStock(int $variantId, int $warehouseId, int $quantity, string $orderCode): void
    {
        $variantWarehouseStockRepo = $this->getVariantWarehouseStockRepo();
        $variantWarehouseStockLogRepo = $this->getVariantWarehouseStockLogRepo();
        
        // Lock and get existing stock to prevent race conditions
        $existingStock = $variantWarehouseStockRepo->getModel()
            ->lockForUpdate()
            ->where('product_variant_id', $variantId)
            ->where('warehouse_id', $warehouseId)
            ->first();
        
        $beforeStock = $existingStock ? (int) $existingStock->stock_quantity : 0;
        $afterStock = $beforeStock + $quantity;
        
        // Update or create warehouse stock (already locked, safe to update)
        $variantWarehouseStockRepo->updateOrCreateStock(
            [
                'product_variant_id' => $variantId,
                'warehouse_id' => $warehouseId,
            ],
            [
                'stock_quantity' => $afterStock,
            ]
        );
        
        // Create log
        $variantWarehouseStockLogRepo->create([
            'product_variant_id' => $variantId,
            'warehouse_id' => $warehouseId,
            'before_stock' => $beforeStock,
            'change_stock' => $quantity,
            'after_stock' => $afterStock,
            'reason' => "Nhập hàng từ đơn nhập #{$orderCode}",
            'transaction_type' => 'import',
            'user_id' => Auth::id(),
        ]);
    }
    
    /**
     * Tự động tạo batch DEFAULT và phân bổ stock khi sản phẩm là batch nhưng không có batch_allocations
     * Trường hợp này xảy ra khi đơn nhập được tạo khi sản phẩm là basic, sau đó sản phẩm chuyển thành batch
     */
    protected function handleAutoBatchAllocation(?int $productId, ?int $variantId, int $warehouseId, int $quantity, string $orderCode): void
    {
        Log::info('Auto-creating DEFAULT batch for import', [
            'product_id' => $productId,
            'variant_id' => $variantId,
            'warehouse_id' => $warehouseId,
            'quantity' => $quantity,
            'order_code' => $orderCode,
        ]);
        
        DB::transaction(function () use ($productId, $variantId, $warehouseId, $quantity, $orderCode) {
            // Lấy hoặc tạo batch DEFAULT
            $defaultBatch = $this->getOrCreateDefaultBatch($productId, $variantId);
            
            // Cập nhật batch warehouse stock
            $batchWarehouseRepo = $this->getBatchWarehouseRepo();
            $batchStockLogRepo = $this->getBatchStockLogRepo();
            
            $existingBatchStock = $batchWarehouseRepo->getModel()
                ->lockForUpdate()
                ->where('product_batch_id', $defaultBatch->id)
                ->where('warehouse_id', $warehouseId)
                ->first();
            
            $beforeBatchStock = $existingBatchStock ? (int) $existingBatchStock->stock_quantity : 0;
            $afterBatchStock = $beforeBatchStock + $quantity;
            
            // Update or create batch warehouse stock
            $batchWarehouseRepo->updateOrCreateStock(
                [
                    'product_batch_id' => $defaultBatch->id,
                    'warehouse_id' => $warehouseId,
                ],
                [
                    'stock_quantity' => $afterBatchStock,
                ]
            );
            
            // Ghi log cho batch stock
            $batchStockLogRepo->create([
                'product_batch_id' => $defaultBatch->id,
                'product_id' => $productId,
                'product_variant_id' => $variantId,
                'warehouse_id' => $warehouseId,
                'before_stock' => $beforeBatchStock,
                'change_stock' => $quantity,
                'after_stock' => $afterBatchStock,
                'reason' => "Nhập hàng tự động vào lô DEFAULT từ đơn nhập #{$orderCode} (sản phẩm đã chuyển sang quản lý theo lô)",
                'transaction_type' => 'import',
                'user_id' => Auth::id(),
            ]);
            
            // Sync warehouse stock từ batch
            if ($variantId) {
                $this->variantService->syncWarehouseStockFromBatches($variantId);
            } elseif ($productId) {
                $this->productService->syncWarehouseStockFromBatches($productId);
            }
        });
    }
    
    /**
     * Get or create default batch for product or variant
     */
    protected function getOrCreateDefaultBatch(?int $productId, ?int $variantId): \App\Models\ProductBatch
    {
        if ($variantId) {
            // Tìm batch DEFAULT cho variant
            $defaultBatch = \App\Models\ProductBatch::where('product_variant_id', $variantId)
                ->where('is_default', true)
                ->first();
            
            if ($defaultBatch) {
                return $defaultBatch;
            }
            
            // Nếu không có, đánh dấu tất cả batches khác không phải default
            \App\Models\ProductBatch::where('product_variant_id', $variantId)
                ->update(['is_default' => false]);
            
            // Tạo batch DEFAULT mới cho variant
            return \App\Models\ProductBatch::create([
                'product_id' => $productId,
                'product_variant_id' => $variantId,
                'code' => 'DEFAULT',
                'is_default' => true,
                'status' => 'active',
            ]);
        } elseif ($productId) {
            // Tìm batch DEFAULT cho product
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
            
            // Tạo batch DEFAULT mới cho product
            return \App\Models\ProductBatch::create([
                'product_id' => $productId,
                'product_variant_id' => null,
                'code' => 'DEFAULT',
                'is_default' => true,
                'status' => 'active',
            ]);
        }
        
        throw new \Exception('Cannot create default batch: missing product_id or variant_id');
    }
}
