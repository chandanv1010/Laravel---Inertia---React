<?php

namespace App\Pipelines\ProductManagementTypeChange\Pipes;

use App\Pipelines\ProductManagementTypeChange\Payloads\ProductManagementTypeChangePayload;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ConvertProductBatchToBasicPipe extends AbstractProductManagementTypeChangePipe
{
    public function handle(ProductManagementTypeChangePayload $payload, \Closure $next): ProductManagementTypeChangePayload
    {
        // Chỉ xử lý nếu là chuyển từ batch -> basic và product không có variants
        if (!$payload->isBatchToBasic() || $payload->hasVariants) {
            return $next($payload);
        }
        
        Log::info('Converting product from batch to basic', [
            'product_id' => $payload->productId
        ]);
        
        // Không cần wrap trong transaction vì PipelineManager đã wrap rồi
        // Lấy default warehouse (chi nhánh chính - code MAIN)
        $defaultWarehouseId = $this->warehouseService->getDefaultWarehouseId();
        if (!$defaultWarehouseId) {
            throw new \Exception('Cannot convert batch to basic: No default warehouse found');
        }

        // Lấy tất cả batch stocks
        $batchWarehouses = \App\Models\ProductBatchWarehouse::query()
            ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
            ->where('product_batches.product_id', $payload->productId)
            ->whereNull('product_batches.product_variant_id')
            ->where('product_batches.status', 'active')
            ->select('product_batch_warehouses.*')
            ->get();

        // Tính tổng stock tất cả các kho để chuyển về chi nhánh chính
        $totalStock = $batchWarehouses->sum('stock_quantity');

        if ($totalStock > 0) {
            // Lock warehouse stock của chi nhánh chính để tránh race condition
            $mainWarehouseStock = \App\Models\ProductWarehouseStock::lockForUpdate()
                ->where('product_id', $payload->productId)
                ->where('warehouse_id', $defaultWarehouseId)
                ->first();

            $beforeStock = $mainWarehouseStock ? $mainWarehouseStock->stock_quantity : 0;
            $afterStock = $beforeStock + $totalStock;

            // Cập nhật warehouse stock của chi nhánh chính
            \App\Models\ProductWarehouseStock::updateOrCreate(
                [
                    'product_id' => $payload->productId,
                    'warehouse_id' => $defaultWarehouseId,
                ],
                [
                    'stock_quantity' => $afterStock,
                ]
            );

            // Ghi log cho warehouse stock
            \App\Models\ProductWarehouseStockLog::create([
                'product_id' => $payload->productId,
                'warehouse_id' => $defaultWarehouseId,
                'before_stock' => $beforeStock,
                'change_stock' => $totalStock,
                'after_stock' => $afterStock,
                'reason' => 'Chuyển đổi từ quản lý theo lô sang quản lý thông thường',
                'transaction_type' => 'adjust',
                'user_id' => Auth::id(),
            ]);

            // Xóa tất cả batch warehouse stocks (set về 0) với lock
            foreach ($batchWarehouses as $batchWarehouse) {
                // Lock batch warehouse stock trước khi update
                $lockedBatchWarehouse = \App\Models\ProductBatchWarehouse::lockForUpdate()
                    ->where('id', $batchWarehouse->id)
                    ->first();
                
                if (!$lockedBatchWarehouse) {
                    continue; // Đã bị xóa hoặc không tồn tại
                }
                
                $beforeBatchStock = $lockedBatchWarehouse->stock_quantity;
                $lockedBatchWarehouse->update(['stock_quantity' => 0]);

                // Ghi log cho batch stock (trừ stock)
                \App\Models\ProductBatchStockLog::create([
                    'product_batch_id' => $lockedBatchWarehouse->product_batch_id,
                    'product_id' => $payload->productId,
                    'product_variant_id' => null,
                    'warehouse_id' => $lockedBatchWarehouse->warehouse_id,
                    'before_stock' => $beforeBatchStock,
                    'change_stock' => -$beforeBatchStock,
                    'after_stock' => 0,
                    'reason' => 'Chuyển đổi từ quản lý theo lô sang quản lý thông thường',
                    'user_id' => Auth::id(),
                    'transaction_type' => 'adjust',
                ]);
            }
        }
        
        return $next($payload);
    }
}
