<?php

namespace App\Pipelines\ProductManagementTypeChange\Pipes;

use App\Pipelines\ProductManagementTypeChange\Payloads\ProductManagementTypeChangePayload;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ConvertVariantsBasicToBatchPipe extends AbstractProductManagementTypeChangePipe
{
    public function handle(ProductManagementTypeChangePayload $payload, \Closure $next): ProductManagementTypeChangePayload
    {
        // Chỉ xử lý nếu là chuyển từ basic -> batch và product có variants
        if (!$payload->isBasicToBatch() || !$payload->hasVariants) {
            return $next($payload);
        }
        
        Log::info('Converting variants from basic to batch', [
            'product_id' => $payload->productId,
            'variant_count' => count($payload->variants)
        ]);
        
        // Không cần wrap trong transaction vì PipelineManager đã wrap rồi
        foreach ($payload->variants as $variant) {
            $variantId = is_array($variant) ? $variant['id'] : $variant->id;
            
            // Lấy tất cả warehouse stocks hiện tại của variant
            $warehouseStocks = \App\Models\ProductVariantWarehouseStock::where('product_variant_id', $variantId)
                ->get();

            // Lấy hoặc tạo batch DEFAULT cho variant
            $defaultBatch = $this->getOrCreateDefaultVariantBatch($variantId, $payload->productId);

            // Chuyển stock từ warehouse stocks vào batch warehouses
            foreach ($warehouseStocks as $warehouseStock) {
                if ($warehouseStock->stock_quantity > 0 && $warehouseStock->warehouse_id) {
                    // Lock variant warehouse stock để tránh race condition
                    $lockedWarehouseStock = \App\Models\ProductVariantWarehouseStock::lockForUpdate()
                        ->where('id', $warehouseStock->id)
                        ->first();
                    
                    if (!$lockedWarehouseStock || $lockedWarehouseStock->stock_quantity <= 0) {
                        continue; // Stock đã bị thay đổi hoặc không còn
                    }
                    
                    // Tìm hoặc tạo batch warehouse stock với lock
                    $batchWarehouse = \App\Models\ProductBatchWarehouse::lockForUpdate()
                        ->where('product_batch_id', $defaultBatch->id)
                        ->where('warehouse_id', $lockedWarehouseStock->warehouse_id)
                        ->first();

                    $beforeBatchStock = 0;
                    $stockQuantityToTransfer = $lockedWarehouseStock->stock_quantity;
                    
                    if ($batchWarehouse) {
                        $beforeBatchStock = $batchWarehouse->stock_quantity;
                        // Cộng thêm vào stock hiện có
                        $batchWarehouse->increment('stock_quantity', $stockQuantityToTransfer);
                        $batchWarehouse->refresh();
                    } else {
                        // Tạo mới batch warehouse stock
                        $batchWarehouse = \App\Models\ProductBatchWarehouse::create([
                            'product_batch_id' => $defaultBatch->id,
                            'warehouse_id' => $lockedWarehouseStock->warehouse_id,
                            'stock_quantity' => $stockQuantityToTransfer,
                        ]);
                    }

                    // Ghi log cho batch stock
                    \App\Models\ProductBatchStockLog::create([
                        'product_batch_id' => $defaultBatch->id,
                        'product_id' => $payload->productId,
                        'product_variant_id' => $variantId,
                        'warehouse_id' => $lockedWarehouseStock->warehouse_id,
                        'before_stock' => $beforeBatchStock,
                        'change_stock' => $stockQuantityToTransfer,
                        'after_stock' => $batchWarehouse->stock_quantity,
                        'reason' => 'Chuyển đổi từ quản lý thông thường sang quản lý theo lô',
                        'user_id' => Auth::id(),
                        'transaction_type' => 'adjust',
                    ]);

                    // Xóa warehouse stock (set về 0)
                    $lockedWarehouseStock->update(['stock_quantity' => 0]);
                }
            }

            // Sync lại warehouse stock từ batch cho variant
            $this->variantService->syncWarehouseStockFromBatches($variantId);
        }
        
        return $next($payload);
    }
    
    /**
     * Get or create default batch for variant
     */
    protected function getOrCreateDefaultVariantBatch(int $variantId, int $productId): \App\Models\ProductBatch
    {
        // Tìm batch DEFAULT hiện có
        $defaultBatch = \App\Models\ProductBatch::where('product_variant_id', $variantId)
            ->where('is_default', true)
            ->first();

        if ($defaultBatch) {
            return $defaultBatch;
        }

        // Nếu không có, đánh dấu tất cả batches khác không phải default
        \App\Models\ProductBatch::where('product_variant_id', $variantId)
            ->update(['is_default' => false]);

        // Tạo batch DEFAULT mới
        return \App\Models\ProductBatch::create([
            'product_id' => $productId,
            'product_variant_id' => $variantId,
            'code' => 'DEFAULT',
            'is_default' => true,
            'status' => 'active',
        ]);
    }
}
