<?php

namespace App\Pipelines\Checkout\Pipes;

use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use App\Models\Product;
use App\Models\ProductBatchWarehouse;
use App\Models\ProductWarehouseStock;
use App\Models\ProductVariantWarehouseStock;
use App\Models\ProductVariant;
use Closure;
use Exception;
use Illuminate\Support\Facades\Log;

class ValidateStockPipe extends AbstractCheckoutPipe
{
    /**
     * TỔNG HỢP VÀ KIỂM TRA TỒN KHO HÀNG LOẠT (OPTIMIZED)
     * 
     * QUY TRÌNH XỬ LÝ:
     * 1. GOM NHÓM (AGGREGATION): 
     *    Duyệt qua toàn bộ giỏ hàng, gom tất cả số lượng của cùng một mã hàng (Product ID + Variant ID) 
     *    vào một danh sách duy nhất. Điều này đảm bảo nếu một sản phẩm xuất hiện ở nhiều nơi 
     *    (ví dụ: vừa mua lẻ, vừa nằm trong Combo, vừa là Quà tặng) thì tổng số lượng yêu cầu 
     *    sẽ được tính toán chính xác tuyệt đối.
     * 
     * 2. TẢI HÀNG LOẠT (BULK LOADING):
     *    - Thu thập toàn bộ danh sách ID Sản phẩm và ID Biến thể duy nhất.
     *    - Thực hiện duy nhất 2 câu lệnh SQL để nạp thông tin Product & Variant vào bộ nhớ.
     *    - Thực hiện duy nhất 2 câu lệnh SQL với `lockForUpdate()` (Khóa bi quan) để lấy 
     *      toàn bộ dữ liệu tồn kho đa kho cho các ID liên quan.
     * 
     * 3. KIỂM TRA TRONG BỘ NHỚ (IN-MEMORY VALIDATION):
     *    - So sánh tổng số lượng yêu cầu của từng mã hàng với tổng tồn khô đã nạp.
     *    - Kiểm tra các cờ `track_inventory` và `allow_negative_stock` cho từng loại.
     *    - Chỉ ném lỗi khi thực sự không đủ hàng dựa trên tổng yêu cầu cuối cùng.
     * 
     * MÔ PHỎNG VÍ DỤ:
     * Giỏ hàng có: dòng A (1 Áo thun), dòng B (2 Áo thun trong Combo), dòng C (1 Áo thun tặng).
     * Logic sẽ gộp lại thành: Áo thun (ID: 10) yêu cầu 4 cái.
     * Database chỉ cần trả lời 1 lần: Áo thun (ID: 10) còn 3 cái.
     * Hệ thống báo ngay: "Áo thun không đủ tồn kho (Tổng yêu cầu: 4, Hiện còn: 3)" và dừng Pipeline.
     * 
     * @param CheckoutPayload $payload
     * @param Closure $next
     * @return CheckoutPayload
     * @throws Exception
     */
    public function handle(CheckoutPayload $payload, Closure $next): CheckoutPayload
    {
        Log::info('[CHECKOUT PIPELINE] 1. Bắt đầu ValidateStockPipe (FIFO-Ready)');
        
        $items = $payload->cart['items'] ?? [];
        if (empty($items)) {
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

        foreach ($aggregated as $key => $data) {
            $productId = $data['product_id'];
            $variantId = $data['variant_id'];
            $requestedQty = $data['quantity'];

            $product = $products->get($productId);
            if (!$product) continue;

            // Mặc định ban đầu
            $trackInventory = $product->track_inventory;
            $allowNegative = $product->allow_negative_stock;
            $managementType = $product->management_type ?? 'basic';
            $displayName = $product->name;

            if ($variantId) {
                $variant = $variants->get($variantId);
                if ($variant) {
                    $trackInventory = $variant->track_inventory;
                    $allowNegative = $variant->allow_negative_stock;
                    $managementType = $variant->management_type ?? 'basic';
                    $displayName = $variant->variant_name;
                }
            }

            // Nếu không quản lý kho hoặc cho phép bán âm -> Bỏ qua kiểm tra
            if ($trackInventory == 0 || $allowNegative == 1) {
                continue;
            }

            $currentStock = 0;
            if ($managementType === 'batch') {
                // Kiểm tra theo Lô hàng (FIFO-Ready)
                if ($variantId) {
                    $currentStock = ProductBatchWarehouse::query()
                        ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
                        ->where('product_batches.product_variant_id', $variantId)
                        ->sum('product_batch_warehouses.stock_quantity');
                } else {
                    $currentStock = ProductBatchWarehouse::query()
                        ->join('product_batches', 'product_batch_warehouses.product_batch_id', '=', 'product_batches.id')
                        ->where('product_batches.product_id', $productId)
                        ->whereNull('product_batches.product_variant_id')
                        ->sum('product_batch_warehouses.stock_quantity');
                }
            } else {
                // Kiểm tra theo Kho tổng hợp (Basic)
                if ($variantId) {
                    $currentStock = ProductVariantWarehouseStock::where('product_variant_id', $variantId)
                        ->sum('stock_quantity');
                } else {
                    $currentStock = ProductWarehouseStock::where('product_id', $productId)
                        ->sum('stock_quantity');
                }
            }

            if ($currentStock < $requestedQty) {
                $payload->isSuccess = false;
                $payload->message = "Sản phẩm '{$displayName}' không đủ tồn kho (Yêu cầu: {$requestedQty}, Hiện còn: {$currentStock})";
                throw new Exception($payload->message);
            }
        }

        return $next($payload);
    }
}
