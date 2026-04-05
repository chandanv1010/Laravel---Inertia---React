<?php

namespace App\Pipelines\Checkout\Pipes;

use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use App\Models\ProductWarehouseStock;
use App\Models\ProductVariantWarehouseStock;
use App\Models\ProductWarehouseStockLog;
use App\Models\ProductVariantWarehouseStockLog;
use App\Models\ProductBatchWarehouse;
use App\Models\ProductBatchStockLog;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\Auth;
use Closure;
use Exception;
use Illuminate\Support\Facades\Log;

class DeductInventoryPipe extends AbstractCheckoutPipe
{
    /**
     * TRỪ TỒN KHO THEO NGUYÊN TẮC FIFO (FIRST IN, FIRST OUT)
     * 
     * Lớp này chịu trách nhiệm trừ tồn kho dựa trên các lô hàng (Batches) nhập trước.
     * 
     * CƠ CHẾ XỬ LÝ:
     * 1. GOM NHÓM SỐ LƯỢNG (AGGREGATION):
     *    Gom tổng lượng hàng cần trừ của cùng một sản phẩm/biến thể.
     * 
     * 2. CHIẾN LƯỢC FIFO (BATCH-BASED):
     *    Hệ thống KHÔNG ưu tiên kho có nhiều hàng nhất, mà ưu tiên các Lô hàng có:
     *    - manufacturing_date (Ngày sản xuất) cũ nhất trước.
     *    - Nếu cùng ngày, ưu tiên ID lô nhỏ hơn (nhập trước).
     * 
     * 3. ĐỒNG BỘ 2 TẦNG TỒN KHO:
     *    - Cập nhật số lượng tại Lô cụ thể (ProductBatchWarehouse).
     *    - Đồng bộ giảm số lượng tổng hợp tại Kho (ProductWarehouseStock).
     * 
     * 4. GHI LOG KIỂM TOÁN (INVENTORY LOGGING):
     *    Ghi log cả mức Lô hàng (Batch Log) và mức Kho hàng (Warehouse Log) để truy vết.
     * 
     * MÔ PHỎNG VÍ DỤ:
     * Yêu cầu trừ: 5 sản phẩm X.
     * Kho A (Lô 1 - SX: 2023): có 3 cái.
     * Kho B (Lô 2 - SX: 2024): có 10 cái.
     * Logic xử lý: 
     *    - Trừ hết 3 cái tại Kho A (Lô 1 - cũ nhất).
     *    - Tiếp tục sang Kho B trừ nốt 2 cái (Lô 2).
     * 
     * @param CheckoutPayload $payload
     * @param Closure $next
     * @return CheckoutPayload
     * @throws Exception
     */
    public function handle(CheckoutPayload $payload, Closure $next): CheckoutPayload
    {
        Log::info('[CHECKOUT PIPELINE] 4. Bắt đầu DeductInventoryPipe (Optimized)');
        
        $items = $payload->cart['items'] ?? [];
        $order = $payload->order;

        if (empty($items) || !$order) {
            return $next($payload);
        }

        $aggregated = [];
        foreach ($items as $item) {
            $pid = $item['product_id'];
            $vid = $item['variant_id'] ?? 0;
            $key = "{$pid}_{$vid}";

            if (!isset($aggregated[$key])) {
                $aggregated[$key] = [
                    'product_id' => $pid,
                    'variant_id' => $vid ?: null,
                    'quantity' => 0,
                ];
            }
            $aggregated[$key]['quantity'] += (int)$item['quantity'];
        }

        $productIds = collect($aggregated)->pluck('product_id')->unique()->toArray();
        $variantIds = collect($aggregated)->pluck('variant_id')->filter()->unique()->toArray();

        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');
        $variants = ProductVariant::whereIn('id', $variantIds)->get()->keyBy('id');

        // Không cần beginTransaction/commit/rollback ở đây vì
        // CheckoutPipelineManager đã bọc toàn bộ Pipeline trong DB::transaction().
        // Nếu mở thêm nested transaction, DB::rollBack() bên trong sẽ rollback
        // cả transaction ngoài, gây mất dữ liệu không mong muốn (MySQL InnoDB).
        foreach ($aggregated as $data) {
            $productId = $data['product_id'];
            $variantId = $data['variant_id'];
            $quantityNeeded = $data['quantity'];

            $trackInventory = true;
            $allowNegative = false;
            $managementType = 'basic';

            if ($variantId) {
                $variant = $variants->get($variantId);
                $product = $products->get($productId);
                $trackInventory = $variant->track_inventory ?? true;
                $allowNegative = $variant->allow_negative_stock ?? false;
                $managementType = $product->management_type ?? 'basic';
            } else {
                $product = $products->get($productId);
                $trackInventory = $product->track_inventory ?? true;
                $allowNegative = $product->allow_negative_stock ?? false;
                $managementType = $product->management_type ?? 'basic';
            }

            if (!$trackInventory) {
                continue;
            }

            if ($variantId) {
                $this->deductVariantStock($order, $variantId, $quantityNeeded, $managementType, $allowNegative);
            } else {
                $this->deductProductStock($order, $productId, $quantityNeeded, $managementType, $allowNegative);
            }
        }

        return $next($payload);
    }

    protected function deductProductStock($order, $productId, $quantityNeeded, $managementType, $allowNegative)
    {
        $originalQuantityNeeded = $quantityNeeded;
        if ($managementType === 'batch') {
            $this->deductProductBatchFIFO($order, $productId, $quantityNeeded, $allowNegative);
        } else {
            $this->deductProductBasic($order, $productId, $quantityNeeded, $allowNegative);
        }

        // ✅ ĐỒNG BỘ: Cập nhật cache UI
        app(\App\Services\Interfaces\Product\ProductServiceInterface::class)->clearCache($productId);
    }

    protected function deductProductBatchFIFO($order, $productId, $quantityNeeded, $allowNegative)
    {
        $batchStocks = ProductBatchWarehouse::query()
            ->with('batch')
            ->select('product_batch_warehouses.*')
            ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
            ->where('product_batches.product_id', $productId)
            ->where('product_batch_warehouses.stock_quantity', '>', 0)
            ->orderBy('product_batches.manufactured_at', 'asc')
            ->orderBy('product_batches.id', 'asc')
            ->lockForUpdate()
            ->get();

        // Nếu không có lô nào và cho phép bán âm, lấy lô bất kỳ (ví dụ lô gần nhất) để trừ
        if ($batchStocks->isEmpty() && $allowNegative) {
            $batchStocks = ProductBatchWarehouse::query()
                ->with('batch')
                ->select('product_batch_warehouses.*')
                ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
                ->where('product_batches.product_id', $productId)
                ->orderBy('product_batches.id', 'desc')
                ->limit(1)
                ->lockForUpdate()
                ->get();
        }

        foreach ($batchStocks as $index => $batchStock) {
            if ($quantityNeeded <= 0) break;

            /** @var ProductBatchWarehouse $batchStock */
            $isLastLoop = ($index === $batchStocks->count() - 1);
            
            // Nếu là dòng cuối và cho phép bán âm, ta lấy hết số lượng cần thiết kể cả âm
            $take = ($isLastLoop && $allowNegative) 
                ? $quantityNeeded 
                : min($batchStock->stock_quantity, $quantityNeeded);

            $beforeBatch = $batchStock->stock_quantity;
            $afterBatch = $beforeBatch - $take;
            $batchStock->stock_quantity = $afterBatch;
            $batchStock->save();

            $warehouseStock = ProductWarehouseStock::where('product_id', $productId)
                ->where('warehouse_id', $batchStock->warehouse_id)
                ->lockForUpdate()
                ->first();
            
            if ($warehouseStock) {
                $warehouseStock->decrement('stock_quantity', $take);
            }

            ProductBatchStockLog::create([
                'product_batch_id' => $batchStock->product_batch_id,
                'product_id' => $productId,
                'warehouse_id' => $batchStock->warehouse_id,
                'before_stock' => $beforeBatch,
                'change_stock' => -$take,
                'after_stock' => $afterBatch,
                'reason' => "Xuất lô (FIFO" . ($allowNegative ? " - Negative OK" : "") . ") đơn #{$order->order_code}",
                'transaction_type' => 'export',
                'user_id' => \Illuminate\Support\Facades\Auth::guard('web')->id(),
                'reference_id' => $order->id,
                'reference_type' => get_class($order),
            ]);

            ProductWarehouseStockLog::create([
                'product_id' => $productId,
                'warehouse_id' => $batchStock->warehouse_id,
                'before_stock' => $warehouseStock ? $warehouseStock->stock_quantity + $take : $beforeBatch,
                'change_stock' => -$take,
                'after_stock' => $warehouseStock ? $warehouseStock->stock_quantity : $afterBatch,
                'reason' => "Xuất kho lô #{$batchStock->batch->code} đơn #{$order->order_code}",
                'transaction_type' => 'export',
                'user_id' => \Illuminate\Support\Facades\Auth::guard('web')->id(),
                'reference_id' => $order->id,
                'reference_type' => get_class($order),
            ]);

            $quantityNeeded -= $take;
        }

        if ($quantityNeeded > 0) {
            throw new Exception("Lỗi: Không đủ hàng trong các Lô (FIFO) cho sản phẩm ID: {$productId}");
        }
    }

    protected function deductProductBasic($order, $productId, $quantityNeeded, $allowNegative)
    {
        $warehouseStocks = ProductWarehouseStock::where('product_id', $productId)
            ->where('stock_quantity', '>', 0)
            ->orderBy('stock_quantity', 'desc') // Ưu tiên kho nhiều hàng nhất
            ->lockForUpdate()
            ->get();

        // Nếu hết hàng và cho phép bán âm, lấy kho bất kỳ để trừ âm
        if ($warehouseStocks->isEmpty() && $allowNegative) {
            $warehouseStocks = ProductWarehouseStock::where('product_id', $productId)
                ->limit(1)
                ->lockForUpdate()
                ->get();
        }

        foreach ($warehouseStocks as $index => $warehouseStock) {
            if ($quantityNeeded <= 0) break;

            $isLastLoop = ($index === $warehouseStocks->count() - 1);
            $take = ($isLastLoop && $allowNegative) 
                ? $quantityNeeded 
                : min($warehouseStock->stock_quantity, $quantityNeeded);

            $before = $warehouseStock->stock_quantity;
            $after = $before - $take;
            
            $warehouseStock->stock_quantity = $after;
            $warehouseStock->save();

            ProductWarehouseStockLog::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseStock->warehouse_id,
                'before_stock' => $before,
                'change_stock' => -$take,
                'after_stock' => $after,
                'reason' => "Xuất kho (Basic" . ($allowNegative ? " - Negative OK" : "") . ") đơn #{$order->order_code}",
                'transaction_type' => 'export',
                'user_id' => \Illuminate\Support\Facades\Auth::guard('web')->id(),
                'reference_id' => $order->id,
                'reference_type' => get_class($order),
            ]);

            $quantityNeeded -= $take;
        }

        if ($quantityNeeded > 0) {
            throw new Exception("Lỗi: Không đủ hàng (Basic) cho sản phẩm ID: {$productId}");
        }
    }

    protected function deductVariantStock($order, $variantId, $quantityNeeded, $managementType, $allowNegative)
    {
        if ($managementType === 'batch') {
            $this->deductVariantBatchFIFO($order, $variantId, $quantityNeeded, $allowNegative);
        } else {
            $this->deductVariantBasic($order, $variantId, $quantityNeeded, $allowNegative);
        }
    }

    protected function deductVariantBatchFIFO($order, $variantId, $quantityNeeded, $allowNegative)
    {
        $originalQuantityNeeded = $quantityNeeded; // Lưu lại để sync sau

        $batchStocks = ProductBatchWarehouse::query()
            ->with('batch')
            ->select('product_batch_warehouses.*')
            ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
            ->where('product_batches.product_variant_id', $variantId)
            ->where('product_batch_warehouses.stock_quantity', '>', 0)
            ->orderBy('product_batches.manufactured_at', 'asc')
            ->orderBy('product_batches.id', 'asc')
            ->lockForUpdate()
            ->get();

        if ($batchStocks->isEmpty() && $allowNegative) {
            $batchStocks = ProductBatchWarehouse::query()
                ->with('batch')
                ->select('product_batch_warehouses.*')
                ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
                ->where('product_batches.product_variant_id', $variantId)
                ->orderBy('product_batches.id', 'desc')
                ->limit(1)
                ->lockForUpdate()
                ->get();
        }

        foreach ($batchStocks as $index => $batchStock) {
            if ($quantityNeeded <= 0) break;

            /** @var ProductBatchWarehouse $batchStock */
            $isLastLoop = ($index === $batchStocks->count() - 1);
            $take = ($isLastLoop && $allowNegative) ? $quantityNeeded : min($batchStock->stock_quantity, $quantityNeeded);

            $beforeBatch = $batchStock->stock_quantity;
            $afterBatch = $beforeBatch - $take;
            $batchStock->stock_quantity = $afterBatch;
            $batchStock->save();

            $warehouseStock = ProductVariantWarehouseStock::where('product_variant_id', $variantId)
                ->where('warehouse_id', $batchStock->warehouse_id)
                ->lockForUpdate()
                ->first();
            
            if ($warehouseStock) {
                $warehouseStock->decrement('stock_quantity', $take);
            }

            ProductBatchStockLog::create([
                'product_batch_id' => $batchStock->product_batch_id,
                'product_id' => $batchStock->batch->product_id,
                'product_variant_id' => $variantId,
                'warehouse_id' => $batchStock->warehouse_id,
                'before_stock' => $beforeBatch,
                'change_stock' => -$take,
                'after_stock' => $afterBatch,
                'reason' => "Xuất biến thể Lô (FIFO" . ($allowNegative ? " - Negative OK" : "") . ") đơn #{$order->order_code}",
                'transaction_type' => 'export',
                'user_id' => \Illuminate\Support\Facades\Auth::guard('web')->id(),
                'reference_id' => $order->id,
                'reference_type' => get_class($order),
            ]);

            ProductVariantWarehouseStockLog::create([
                'product_variant_id' => $variantId,
                'warehouse_id' => $batchStock->warehouse_id,
                'before_stock' => $warehouseStock ? $warehouseStock->stock_quantity + $take : $beforeBatch,
                'change_stock' => -$take,
                'after_stock' => $warehouseStock ? $warehouseStock->stock_quantity : $afterBatch,
                'reason' => "Xuất kho biến thể lô #{$batchStock->batch->code} đơn #{$order->order_code}",
                'transaction_type' => 'export',
                'user_id' => \Illuminate\Support\Facades\Auth::guard('web')->id(),
                'reference_id' => $order->id,
                'reference_type' => get_class($order),
            ]);

            $quantityNeeded -= $take;
        }

        if ($quantityNeeded > 0) {
            throw new Exception("Lỗi: Không đủ biến thể trong các Lô (FIFO) cho ID: {$variantId}");
        }

        // ✅ ĐỒNG BỘ: Cập nhật cột stock_quantity trên product_variants
        // (cache tổng hợp để admin UI hiển thị đúng mà không cần JOIN bảng warehouse)
        $actualDeducted = $originalQuantityNeeded - $quantityNeeded;
        if ($actualDeducted > 0) {
            ProductVariant::where('id', $variantId)->lockForUpdate()->decrement('stock_quantity', $actualDeducted);
            
            // Clear cache cho cả variant và product cha
            $variant = ProductVariant::find($variantId);
            if ($variant) {
                app(\App\Services\Interfaces\Product\ProductServiceInterface::class)->clearCache($variant->product_id);
            }
        }
    }

    protected function deductVariantBasic($order, $variantId, $quantityNeeded, $allowNegative)
    {
        $originalQuantityNeeded = $quantityNeeded; // Lưu lại để sync sau

        $warehouseStocks = ProductVariantWarehouseStock::where('product_variant_id', $variantId)
            ->where('stock_quantity', '>', 0)
            ->orderBy('stock_quantity', 'desc')
            ->lockForUpdate()
            ->get();

        if ($warehouseStocks->isEmpty() && $allowNegative) {
            $warehouseStocks = ProductVariantWarehouseStock::where('product_variant_id', $variantId)
                ->limit(1)
                ->lockForUpdate()
                ->get();
        }

        foreach ($warehouseStocks as $index => $warehouseStock) {
            if ($quantityNeeded <= 0) break;

            $isLastLoop = ($index === $warehouseStocks->count() - 1);
            $take = ($isLastLoop && $allowNegative) ? $quantityNeeded : min($warehouseStock->stock_quantity, $quantityNeeded);

            $before = $warehouseStock->stock_quantity;
            $after = $before - $take;
            
            $warehouseStock->stock_quantity = $after;
            $warehouseStock->save();

            ProductVariantWarehouseStockLog::create([
                'product_variant_id' => $variantId,
                'warehouse_id' => $warehouseStock->warehouse_id,
                'before_stock' => $before,
                'change_stock' => -$take,
                'after_stock' => $after,
                'reason' => "Xuất kho biến thể (Basic" . ($allowNegative ? " - Negative OK" : "") . ") đơn #{$order->order_code}",
                'transaction_type' => 'export',
                'user_id' => \Illuminate\Support\Facades\Auth::guard('web')->id(),
                'reference_id' => $order->id,
                'reference_type' => get_class($order),
            ]);

            $quantityNeeded -= $take;
        }

        if ($quantityNeeded > 0) {
            throw new Exception("Lỗi: Không đủ biến thể (Basic) cho ID: {$variantId}");
        }

        // ✅ ĐỒNG BỘ: Cập nhật cột stock_quantity trên product_variants
        // (cache tổng hợp để admin UI hiển thị đúng mà không cần JOIN bảng warehouse)
        $actualDeducted = $originalQuantityNeeded - $quantityNeeded;
        if ($actualDeducted > 0) {
            ProductVariant::where('id', $variantId)->lockForUpdate()->decrement('stock_quantity', $actualDeducted);
        }
    }
}
