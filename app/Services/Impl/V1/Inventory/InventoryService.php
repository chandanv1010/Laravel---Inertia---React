<?php

namespace App\Services\Impl\V1\Inventory;

use App\Models\Order;
use App\Models\ProductBatchStockLog;
use App\Models\ProductBatchWarehouse;
use App\Models\ProductWarehouseStock;
use App\Models\ProductVariantWarehouseStock;
use App\Models\ProductWarehouseStockLog;
use App\Models\ProductVariantWarehouseStockLog;
use App\Services\Interfaces\Inventory\InventoryServiceInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Exception;

class InventoryService implements InventoryServiceInterface
{
    /**
     * Hoàn lại tồn kho từ một đơn hàng khi bị hủy
     * Đọc từ log chi tiết các lô hàng đã trừ để trả lại đúng vị trí cũ.
     */
    public function restoreOrderInventory(Order $order): bool
    {
        // 1. Chỉ hoàn kho nều đơn hàng chưa được hoàn kho trước đó
        // (Có thể check meta hoặc log trùng lặp, ở đây check nếu có log 'return' cho order này chưa)
        $alreadyRestored = ProductBatchStockLog::where('reference_id', $order->id)
            ->where('reference_type', Order::class)
            ->where('transaction_type', 'return')
            ->exists();

        if ($alreadyRestored) {
            return false;
        }

        // 2. Tìm tất cả các log trừ kho của đơn hàng này
        $deductionLogs = ProductBatchStockLog::where('reference_id', $order->id)
            ->where('reference_type', Order::class)
            ->where('transaction_type', 'export') // Hoặc kiểu tương ứng lúc trừ
            ->get();

        if ($deductionLogs->isEmpty()) {
            return false;
        }

        DB::beginTransaction();
        try {
            foreach ($deductionLogs as $log) {
                $qtyToReturn = abs($log->change_stock);
                
                // A. Cập nhật số lượng tại Lô (Batch) chi tiết
                $batchWarehouse = ProductBatchWarehouse::where('product_batch_id', $log->product_batch_id)
                    ->where('warehouse_id', $log->warehouse_id)
                    ->lockForUpdate()
                    ->first();

                if ($batchWarehouse) {
                    $before = $batchWarehouse->stock_quantity;
                    $batchWarehouse->stock_quantity += $qtyToReturn;
                    $batchWarehouse->save();

                    // Ghi log hoàn sản phẩm vào Lô
                    ProductBatchStockLog::create([
                        'product_batch_id' => $log->product_batch_id,
                        'product_id' => $log->product_id,
                        'product_variant_id' => $log->product_variant_id,
                        'warehouse_id' => $log->warehouse_id,
                        'before_stock' => $before,
                        'change_stock' => $qtyToReturn,
                        'after_stock' => $batchWarehouse->stock_quantity,
                        'reason' => "Hoàn kho từ đơn hàng hủy: " . $order->order_code,
                        'user_id' => Auth::id() ?? 1,
                        'transaction_type' => 'return',
                        'reference_id' => $order->id,
                        'reference_type' => Order::class,
                    ]);
                }

                // B. Cập nhật tồn kho tổng hợp tại Kho (Warehouse Stock)
                $warehouseStock = ProductWarehouseStock::where('product_id', $log->product_id)
                    ->where('warehouse_id', $log->warehouse_id)
                    ->lockForUpdate()
                    ->first();

                if ($warehouseStock) {
                    $beforeW = $warehouseStock->stock_quantity;
                    $warehouseStock->stock_quantity += $qtyToReturn;
                    $warehouseStock->save();

                    ProductWarehouseStockLog::create([
                        'product_id' => $log->product_id,
                        'warehouse_id' => $log->warehouse_id,
                        'before_stock' => $beforeW,
                        'change_stock' => $qtyToReturn,
                        'after_stock' => $warehouseStock->stock_quantity,
                        'reason' => "Hoàn kho từ đơn hàng hủy (Tổng hợp): " . $order->order_code,
                        'user_id' => Auth::id() ?? 1,
                        'transaction_type' => 'return',
                        'reference_id' => $order->id,
                        'reference_type' => Order::class,
                    ]);
                }

                // C. Cập nhật tồn kho Biến thể (nếu có)
                if ($log->product_variant_id) {
                    $variantStock = ProductVariantWarehouseStock::where('product_variant_id', $log->product_variant_id)
                        ->where('warehouse_id', $log->warehouse_id)
                        ->lockForUpdate()
                        ->first();

                    if ($variantStock) {
                        $beforeV = $variantStock->stock_quantity;
                        $variantStock->stock_quantity += $qtyToReturn;
                        $variantStock->save();

                        ProductVariantWarehouseStockLog::create([
                            'product_variant_id' => $log->product_variant_id,
                            'warehouse_id' => $log->warehouse_id,
                            'before_stock' => $beforeV,
                            'change_stock' => $qtyToReturn,
                            'after_stock' => $variantStock->stock_quantity,
                            'reason' => "Hoàn kho từ đơn hàng hủy (Biến thể): " . $order->order_code,
                            'user_id' => Auth::id() ?? 1,
                            'transaction_type' => 'return',
                            'reference_id' => $order->id,
                            'reference_type' => Order::class,
                        ]);

                        // ✅ ĐỒNG BỘ: Cập nhật cột stock_quantity cache trên ProductVariant
                        \App\Models\ProductVariant::where('id', $log->product_variant_id)
                            ->lockForUpdate()
                            ->increment('stock_quantity', $qtyToReturn);
                    }
                } else {
                    // Nếu là sản phẩm đơn giản (không biến thể), cập nhật stock_quantity cache trên Product
                    \App\Models\Product::where('id', $log->product_id)
                        ->lockForUpdate()
                        ->increment('stock_quantity', $qtyToReturn);
                }
            }

            DB::commit();
            return true;
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
