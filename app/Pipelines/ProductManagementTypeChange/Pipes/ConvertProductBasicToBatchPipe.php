<?php

namespace App\Pipelines\ProductManagementTypeChange\Pipes;

use App\Pipelines\ProductManagementTypeChange\Payloads\ProductManagementTypeChangePayload;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ConvertProductBasicToBatchPipe extends AbstractProductManagementTypeChangePipe
{
    public function handle(ProductManagementTypeChangePayload $payload, \Closure $next): ProductManagementTypeChangePayload
    {
        // Chỉ xử lý nếu là chuyển từ basic -> batch và product không có variants
        if (!$payload->isBasicToBatch() || $payload->hasVariants) {
            return $next($payload);
        }
        
        Log::info('Converting product from basic to batch', [
            'product_id' => $payload->productId
        ]);
        
        // Không cần wrap trong transaction vì PipelineManager đã wrap rồi
        // Lấy tất cả warehouse stocks hiện tại của product
        $warehouseStocks = \App\Models\ProductWarehouseStock::where('product_id', $payload->productId)
            ->get();

        // Lấy hoặc tạo batch DEFAULT
        $defaultBatch = $this->getOrCreateDefaultBatch($payload->productId);

        // Chuyển stock từ warehouse stocks vào batch warehouses
        foreach ($warehouseStocks as $warehouseStock) {
            if ($warehouseStock->stock_quantity > 0 && $warehouseStock->warehouse_id) {
                // Lock warehouse stock để tránh race condition
                $warehouseStock = \App\Models\ProductWarehouseStock::lockForUpdate()
                    ->where('id', $warehouseStock->id)
                    ->first();
                
                if (!$warehouseStock || $warehouseStock->stock_quantity <= 0) {
                    continue; // Stock đã bị thay đổi hoặc không còn
                }
                
                // Tìm hoặc tạo batch warehouse stock với lock
                $batchWarehouse = \App\Models\ProductBatchWarehouse::lockForUpdate()
                    ->where('product_batch_id', $defaultBatch->id)
                    ->where('warehouse_id', $warehouseStock->warehouse_id)
                    ->first();

                $beforeBatchStock = 0;
                $stockQuantityToTransfer = $warehouseStock->stock_quantity;
                
                if ($batchWarehouse) {
                    $beforeBatchStock = $batchWarehouse->stock_quantity;
                    // Cộng thêm vào stock hiện có
                    $batchWarehouse->increment('stock_quantity', $stockQuantityToTransfer);
                    $batchWarehouse->refresh();
                } else {
                    // Tạo mới batch warehouse stock
                    $batchWarehouse = \App\Models\ProductBatchWarehouse::create([
                        'product_batch_id' => $defaultBatch->id,
                        'warehouse_id' => $warehouseStock->warehouse_id,
                        'stock_quantity' => $stockQuantityToTransfer,
                    ]);
                }

                // Ghi log cho batch stock
                \App\Models\ProductBatchStockLog::create([
                    'product_batch_id' => $defaultBatch->id,
                    'product_id' => $payload->productId,
                    'product_variant_id' => null,
                    'warehouse_id' => $warehouseStock->warehouse_id,
                    'before_stock' => $beforeBatchStock,
                    'change_stock' => $stockQuantityToTransfer,
                    'after_stock' => $batchWarehouse->stock_quantity,
                    'reason' => 'Chuyển đổi từ quản lý thông thường sang quản lý theo lô',
                    'user_id' => Auth::id(),
                    'transaction_type' => 'adjust',
                ]);

                // Xóa warehouse stock (set về 0)
                $warehouseStock->update(['stock_quantity' => 0]);
            }
        }

        // Sync lại warehouse stock từ batch
        $this->productService->syncWarehouseStockFromBatches($payload->productId);
        
        return $next($payload);
    }
    
    /**
     * Get or create default batch for product
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
}
