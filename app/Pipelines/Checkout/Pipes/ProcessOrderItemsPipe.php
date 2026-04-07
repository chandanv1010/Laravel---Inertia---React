<?php

namespace App\Pipelines\Checkout\Pipes;

use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use App\Models\OrderItem;
use Closure;

class ProcessOrderItemsPipe extends AbstractCheckoutPipe
{
    /**
     * Lưu chi tiết danh sách sản phẩm của giỏ hàng vào bảng order_items.
     * 
     * Bước này thực hiện:
     * 1. Duyệt qua từng sản phẩm (item) trong giỏ hàng từ payload.
     * 2. Xác định loại sản phẩm (standard: mặc định, combo_item: sản phẩm thuộc combo, reward: sản phẩm quà tặng).
     * 3. Lưu thông tin chi tiết vào bảng `order_items`: Bao gồm ID sản phẩm, ID biến thể, 
     *    tên hiển thị, số lượng, giá bán, giá gốc và snapshot các chương trình khuyến mãi đi kèm.
     * 4. Gán ID đơn hàng (order_id) vừa tạo ở bước trước cho từng item để liên kết dữ liệu.
     * 
     * @param CheckoutPayload $payload
     * @param Closure $next
     * @return CheckoutPayload
     */
    public function handle(CheckoutPayload $payload, Closure $next): CheckoutPayload
    {
        \Illuminate\Support\Facades\Log::info('[CHECKOUT PIPELINE] 3. Bắt đầu ProcessOrderItemsPipe');
        $cart = $payload->cart;
        $order = $payload->order;
        $items = $cart['items'] ?? [];

        $orderItems = [];

        foreach ($items as $item) {
            $type = 'standard';
            if (!empty($item['is_combo_item']))                                            $type = 'combo_item';
            elseif (!empty($item['is_gift']))                                              $type = 'gift';
            elseif (!empty($item['promo_id']) && empty($item['is_combo_item']))            $type = 'reward';

            // Snapshot combo context if applicable
            $promotionsSnapshot = $item['product_promotions'] ?? [];
            if ($type === 'combo_item' && !empty($item['combo_group_id'])) {
                $promotionsSnapshot['combo_snapshot'] = [
                    'combo_group_id' => $item['combo_group_id'],
                    'combo_name' => $item['combo_name'] ?? 'Combo',
                    'combo_image' => $item['combo_image'] ?? null,
                ];
            }

            $orderItems[] = [
                'product_id' => $item['product_id'],
                'variant_id' => $item['variant_id'] ?? null,
                'type' => $type,
                'combo_group_id' => $item['combo_group_id'] ?? null,
                'product_name' => $item['name'],
                'variant_name' => $item['variant_name'] ?? null,
                'product_image' => $item['image'] ?? ($item['product_image'] ?? null),
                'variant_image' => $item['variant_image'] ?? null,
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'original_price' => $item['original_price'] ?? $item['price'],
                'total' => $item['price'] * $item['quantity'],
                'promotions_snapshot' => $promotionsSnapshot,
            ];
        }

        if (!empty($orderItems)) {
            // Sử dụng createMany thông qua quan hệ để chỉ tốn 1 câu query duy nhất
            $order->orderItems()->createMany($orderItems);
        }

        return $next($payload);
    }
}
