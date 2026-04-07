<?php

namespace App\Services\Impl\V1\Inventory;

use App\Models\Order;
use App\Models\ProductBatchStockLog;
use App\Models\ProductBatchWarehouse;
use App\Models\ProductWarehouseStock;
use App\Models\ProductVariantWarehouseStock;
use App\Models\ProductWarehouseStockLog;
use App\Models\ProductVariantWarehouseStockLog;
use App\Models\ProductVariant;
use App\Models\Product;
use App\Services\Interfaces\Inventory\InventoryServiceInterface;
use App\Services\Interfaces\Product\ProductServiceInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Exception;

class InventoryService implements InventoryServiceInterface
{
    /**
     * Hoàn lại tồn kho từ một đơn hàng khi bị hủy
     * Cải tiến: Tính toán số dư (Balance) để hỗ trợ phục hồi/hủy nhiều lần
     */
    public function restoreOrderInventory(Order $order): bool
    {
        DB::beginTransaction();
        try {
            $affectedProductIds = [];
            $anyRestored = false;

            // A. Hoàn kho từ logs Lô (Batch) - Tính toán số dư
            $batchSummaries = ProductBatchStockLog::where('reference_id', $order->id)
                ->where('reference_type', Order::class)
                ->select(
                    'product_batch_id', 
                    'product_id', 
                    'product_variant_id', 
                    'warehouse_id', 
                    DB::raw('SUM(change_stock) as balance')
                )
                ->groupBy('product_batch_id', 'product_id', 'product_variant_id', 'warehouse_id')
                ->having('balance', '<', 0)
                ->get();

            foreach ($batchSummaries as $sum) {
                $qtyToReturn = abs($sum->balance);
                $affectedProductIds[] = $sum->product_id;
                $anyRestored = true;

                $batchWarehouse = ProductBatchWarehouse::where('product_batch_id', $sum->product_batch_id)
                    ->where('warehouse_id', $sum->warehouse_id)
                    ->lockForUpdate()
                    ->first();

                if ($batchWarehouse) {
                    $before = $batchWarehouse->stock_quantity;
                    $batchWarehouse->stock_quantity += $qtyToReturn;
                    $batchWarehouse->save();

                    ProductBatchStockLog::create([
                        'product_batch_id' => $sum->product_batch_id,
                        'product_id' => $sum->product_id,
                        'product_variant_id' => $sum->product_variant_id,
                        'warehouse_id' => $sum->warehouse_id,
                        'before_stock' => $before,
                        'change_stock' => $qtyToReturn,
                        'after_stock' => $batchWarehouse->stock_quantity,
                        'reason' => "Hoàn kho (Auto-balance) từ đơn hàng hủy: " . $order->order_code,
                        'user_id' => Auth::id() ?? 1,
                        'transaction_type' => 'return',
                        'reference_id' => $order->id,
                        'reference_type' => Order::class,
                    ]);
                }

                // Cập nhật kho tổng của product tại warehouse
                $warehouseStock = ProductWarehouseStock::where('product_id', $sum->product_id)
                    ->where('warehouse_id', $sum->warehouse_id)
                    ->lockForUpdate()
                    ->first();
                if ($warehouseStock) {
                    $warehouseStock->increment('stock_quantity', $qtyToReturn);
                }

                if ($sum->product_variant_id) {
                    $variantStock = ProductVariantWarehouseStock::where('product_variant_id', $sum->product_variant_id)
                        ->where('warehouse_id', $sum->warehouse_id)
                        ->lockForUpdate()
                        ->first();
                    if ($variantStock) {
                        $variantStock->increment('stock_quantity', $qtyToReturn);
                        ProductVariant::where('id', $sum->product_variant_id)->increment('stock_quantity', $qtyToReturn);
                    }
                }
            }

            // B. Hoàn kho từ logs Cơ bản (Basic Product) - Tính toán số dư
            $basicSummaries = ProductWarehouseStockLog::where('reference_id', $order->id)
                ->where('reference_type', Order::class)
                ->select(
                    'product_id', 
                    'warehouse_id', 
                    DB::raw('SUM(change_stock) as balance')
                )
                ->groupBy('product_id', 'warehouse_id')
                ->having('balance', '<', 0)
                ->get();

            foreach ($basicSummaries as $sum) {
                $qtyToReturn = abs($sum->balance);
                $affectedProductIds[] = $sum->product_id;
                $anyRestored = true;

                $warehouseStock = ProductWarehouseStock::where('product_id', $sum->product_id)
                    ->where('warehouse_id', $sum->warehouse_id)
                    ->lockForUpdate()
                    ->first();

                if ($warehouseStock) {
                    $before = $warehouseStock->stock_quantity;
                    $warehouseStock->stock_quantity += $qtyToReturn;
                    $warehouseStock->save();

                    ProductWarehouseStockLog::create([
                        'product_id' => $sum->product_id,
                        'warehouse_id' => $sum->warehouse_id,
                        'before_stock' => $before,
                        'change_stock' => $qtyToReturn,
                        'after_stock' => $warehouseStock->stock_quantity,
                        'reason' => "Hoàn kho Basic (Auto-balance) từ đơn hàng hủy: " . $order->order_code,
                        'user_id' => Auth::id() ?? 1,
                        'transaction_type' => 'return',
                        'reference_id' => $order->id,
                        'reference_type' => Order::class,
                    ]);
                }
            }

            // C. Hoàn kho từ logs Biến thể Cơ bản (Basic Variant) - Tính toán số dư
            $variantSummaries = ProductVariantWarehouseStockLog::where('reference_id', $order->id)
                ->where('reference_type', Order::class)
                ->select(
                    'product_variant_id', 
                    'warehouse_id', 
                    DB::raw('SUM(change_stock) as balance')
                )
                ->groupBy('product_variant_id', 'warehouse_id')
                ->having('balance', '<', 0)
                ->get();

            foreach ($variantSummaries as $sum) {
                $qtyToReturn = abs($sum->balance);
                $anyRestored = true;

                $variantStock = ProductVariantWarehouseStock::where('product_variant_id', $sum->product_variant_id)
                    ->where('warehouse_id', $sum->warehouse_id)
                    ->lockForUpdate()
                    ->first();

                if ($variantStock) {
                    $before = $variantStock->stock_quantity;
                    $variantStock->stock_quantity += $qtyToReturn;
                    $variantStock->save();

                    ProductVariantWarehouseStockLog::create([
                        'product_variant_id' => $sum->product_variant_id,
                        'warehouse_id' => $sum->warehouse_id,
                        'before_stock' => $before,
                        'change_stock' => $qtyToReturn,
                        'after_stock' => $variantStock->stock_quantity,
                        'reason' => "Hoàn kho biến thể (Auto-balance) từ đơn hàng hủy: " . $order->order_code,
                        'user_id' => Auth::id() ?? 1,
                        'transaction_type' => 'return',
                        'reference_id' => $order->id,
                        'reference_type' => Order::class,
                    ]);

                    // Cập nhật cache stock trên ProductVariant
                    $variant = ProductVariant::find($sum->product_variant_id);
                    if ($variant) {
                        $variant->increment('stock_quantity', $qtyToReturn);
                        $affectedProductIds[] = $variant->product_id;
                    }
                }
            }

            DB::commit();

            // Xóa cache cho tất cả sản phẩm bị ảnh hưởng
            if ($anyRestored) {
                foreach (array_unique($affectedProductIds) as $pid) {
                    app(ProductServiceInterface::class)->clearCache($pid);
                }
            }

            return $anyRestored;
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Trừ lại tồn kho cho đơn hàng (thường khi đơn hàng được kích hoạt lại sau khi hủy)
     * Cải tiến: Logic kiểm tra Balance để hỗ trợ phục hồi/hủy nhiều lần
     */
    public function deductOrderInventory(Order $order): bool
    {
        Log::info("Re-deducting stock for order #{$order->id} (Code: {$order->order_code}). Current status: {$order->order_status}");

        // 1. Kiểm tra balance hiện tại của đơn hàng trên TẤT CẢ các bảng logs
        // Tránh tình trạng: Trừ ở bảng Basic rồi, sau đó đổi sang Batch lại trừ tiếp ở bảng Batch.
        $totalBalance = ProductBatchStockLog::where('reference_id', $order->id)->where('reference_type', Order::class)->sum('change_stock') 
                      + ProductWarehouseStockLog::where('reference_id', $order->id)->where('reference_type', Order::class)->sum('change_stock')
                      + ProductVariantWarehouseStockLog::where('reference_id', $order->id)->where('reference_type', Order::class)->sum('change_stock');

        if ($totalBalance < 0) {
             Log::info("Order #{$order->id} still has active export balance (Total: {$totalBalance}). Skipping re-deduction.");
             return false;
        }

        $items = $order->orderItems;
        if ($items->isEmpty()) {
            return false;
        }

        DB::beginTransaction();
        try {
            foreach ($items as $item) {
                $productId = $item->product_id;
                $variantId = $item->variant_id;
                $quantityNeeded = $item->quantity;

                $product = Product::find($productId);
                if (!$product || !($product->track_inventory ?? true)) {
                    continue;
                }

                $managementType = $product->management_type ?? 'basic';
                $allowNegative = false; // Mặc định không cho âm khi admin thao tác tay

                if ($variantId) {
                    $variant = ProductVariant::find($variantId);
                    $allowNegative = $variant->allow_negative_stock ?? false;
                    $this->executeVariantDeduction($order, $variantId, $quantityNeeded, $managementType, $allowNegative);
                } else {
                    $allowNegative = $product->allow_negative_stock ?? false;
                    $this->executeProductDeduction($order, $productId, $quantityNeeded, $managementType, $allowNegative);
                }
            }

            DB::commit();
            return true;
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    protected function executeProductDeduction($order, $productId, $quantityNeeded, $managementType, $allowNegative)
    {
        if ($managementType === 'batch') {
            $this->deductProductBatchFIFO($order, $productId, $quantityNeeded, $allowNegative);
        } else {
            $this->deductProductBasic($order, $productId, $quantityNeeded, $allowNegative);
        }
        app(ProductServiceInterface::class)->clearCache($productId);
    }

    protected function executeVariantDeduction($order, $variantId, $quantityNeeded, $managementType, $allowNegative)
    {
        if ($managementType === 'batch') {
            $this->deductVariantBatchFIFO($order, $variantId, $quantityNeeded, $allowNegative);
        } else {
            $this->deductVariantBasic($order, $variantId, $quantityNeeded, $allowNegative);
        }
        
        $variant = ProductVariant::find($variantId);
        if ($variant) {
            app(ProductServiceInterface::class)->clearCache($variant->product_id);
        }
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
            $isLastLoop = ($index === $batchStocks->count() - 1);
            $take = ($isLastLoop && $allowNegative) ? $quantityNeeded : min($batchStock->stock_quantity, $quantityNeeded);

            $beforeBatch = $batchStock->stock_quantity;
            $newStock = $batchStock->stock_quantity - $take;
            
            DB::table('product_batch_warehouses')
                ->where('id', $batchStock->id)
                ->update(['stock_quantity' => $newStock]);

            $warehouseStock = ProductWarehouseStock::where('product_id', $productId)
                ->where('warehouse_id', $batchStock->warehouse_id)
                ->lockForUpdate()
                ->first();
            
            if ($warehouseStock) {
                $warehouseStock->decrement('stock_quantity', $take);
            }

            $batchStock->stock_quantity = $newStock;

            ProductBatchStockLog::create([
                'product_batch_id' => $batchStock->product_batch_id,
                'product_id' => $productId,
                'warehouse_id' => $batchStock->warehouse_id,
                'before_stock' => $beforeBatch,
                'change_stock' => -$take,
                'after_stock' => $newStock,
                'reason' => "Tái trừ lô (Kích hoạt lại đơn): " . $order->order_code,
                'transaction_type' => 'export',
                'user_id' => Auth::id() ?? 1,
                'reference_id' => $order->id,
                'reference_type' => Order::class,
            ]);

            ProductWarehouseStockLog::create([
                'product_id' => $productId,
                'warehouse_id' => $batchStock->warehouse_id,
                'before_stock' => $warehouseStock ? $warehouseStock->stock_quantity + $take : $beforeBatch,
                'change_stock' => -$take,
                'after_stock' => $warehouseStock ? $warehouseStock->stock_quantity : $newStock,
                'reason' => "Tái trừ kho lô (Kích hoạt lại đơn): " . $order->order_code,
                'transaction_type' => 'export',
                'user_id' => Auth::id() ?? 1,
                'reference_id' => $order->id,
                'reference_type' => Order::class,
            ]);

            $quantityNeeded -= $take;
        }
    }

    protected function deductProductBasic($order, $productId, $quantityNeeded, $allowNegative)
    {
        $originalQuantity = $quantityNeeded;
        $warehouseStocks = ProductWarehouseStock::where('product_id', $productId)
            ->where('stock_quantity', '>', 0)
            ->orderBy('stock_quantity', 'desc')
            ->lockForUpdate()
            ->get();

        if ($warehouseStocks->isEmpty() && $allowNegative) {
            $warehouseStocks = ProductWarehouseStock::where('product_id', $productId)->limit(1)->lockForUpdate()->get();
        }

        foreach ($warehouseStocks as $index => $warehouseStock) {
            if ($quantityNeeded <= 0) break;
            $isLastLoop = ($index === $warehouseStocks->count() - 1);
            $take = ($isLastLoop && $allowNegative) ? $quantityNeeded : min($warehouseStock->stock_quantity, $quantityNeeded);

            $before = $warehouseStock->stock_quantity;
            $newStock = $warehouseStock->stock_quantity - $take;
            $warehouseStock->stock_quantity = $newStock;
            $warehouseStock->save();

            ProductWarehouseStockLog::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseStock->warehouse_id,
                'before_stock' => $before,
                'change_stock' => -$take,
                'after_stock' => $newStock,
                'reason' => "Tái trừ kho Basic (Kích hoạt lại đơn): " . $order->order_code,
                'transaction_type' => 'export',
                'user_id' => Auth::id() ?? 1,
                'reference_id' => $order->id,
                'reference_type' => Order::class,
            ]);

            $quantityNeeded -= $take;
        }
    }

    protected function deductVariantBatchFIFO($order, $variantId, $quantityNeeded, $allowNegative)
    {
        $originalQuantity = $quantityNeeded;
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

        foreach ($batchStocks as $index => $batchStock) {
            if ($quantityNeeded <= 0) break;
            $isLastLoop = ($index === $batchStocks->count() - 1);
            $take = ($isLastLoop && $allowNegative) ? $quantityNeeded : min($batchStock->stock_quantity, $quantityNeeded);

            $beforeBatch = $batchStock->stock_quantity;
            $newStock = $batchStock->stock_quantity - $take;
            
            DB::table('product_batch_warehouses')
                ->where('id', $batchStock->id)
                ->update(['stock_quantity' => $newStock]);
            
            $batchStock->stock_quantity = $newStock;

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
                'after_stock' => $newStock,
                'reason' => "Tái trừ biến thể Lô (Kích hoạt lại đơn): " . $order->order_code,
                'transaction_type' => 'export',
                'user_id' => Auth::id() ?? 1,
                'reference_id' => $order->id,
                'reference_type' => Order::class,
            ]);

            $quantityNeeded -= $take;
        }

        ProductVariant::where('id', $variantId)->lockForUpdate()->decrement('stock_quantity', abs($originalQuantity - $quantityNeeded));
    }

    protected function deductVariantBasic($order, $variantId, $quantityNeeded, $allowNegative)
    {
        $originalQuantity = $quantityNeeded;
        $warehouseStocks = ProductVariantWarehouseStock::where('product_variant_id', $variantId)
            ->where('stock_quantity', '>', 0)
            ->orderBy('stock_quantity', 'desc')
            ->lockForUpdate()
            ->get();

        foreach ($warehouseStocks as $index => $warehouseStock) {
            if ($quantityNeeded <= 0) break;
            $isLastLoop = ($index === $warehouseStocks->count() - 1);
            $take = ($isLastLoop && $allowNegative) ? $quantityNeeded : min($warehouseStock->stock_quantity, $quantityNeeded);

            $before = $warehouseStock->stock_quantity;
            $newStock = $warehouseStock->stock_quantity - $take;
            $warehouseStock->stock_quantity = $newStock;
            $warehouseStock->save();

            ProductVariantWarehouseStockLog::create([
                'product_variant_id' => $variantId,
                'warehouse_id' => $warehouseStock->warehouse_id,
                'before_stock' => $before,
                'change_stock' => -$take,
                'after_stock' => $newStock,
                'reason' => "Tái trừ kho biến thể Basic (Kích hoạt lại đơn): " . $order->order_code,
                'transaction_type' => 'export',
                'user_id' => Auth::id() ?? 1,
                'reference_id' => $order->id,
                'reference_type' => Order::class,
            ]);

            $quantityNeeded -= $take;
        }

        ProductVariant::where('id', $variantId)->lockForUpdate()->decrement('stock_quantity', abs($originalQuantity - $quantityNeeded));
    }
}
