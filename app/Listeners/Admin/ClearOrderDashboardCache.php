<?php

namespace App\Listeners\Admin;

use App\Events\Frontend\Checkout\OrderCreated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ClearOrderDashboardCache implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     * 
     * Giải pháp: Sử dụng Cache Tags để quản lý toàn bộ cache liên quan đến Order Admin.
     * Khi có đơn hàng mới, chúng ta flush toàn bộ tag này.
     */
    public function handle(OrderCreated $event): void
    {
        try {
            // Xóa toàn bộ cache thuộc bộ thẻ 'orders_admin'
            // Điều này đảm bảo Dashboard Admin sẽ load lại dữ liệu mới nhất
            if (Cache::supportsTags()) {
                Cache::tags(['orders_admin'])->flush();
            } else {
                // Fallback nếu driver không hỗ trợ tags (như file driver)
                Cache::forget('admin_order_stats');
                Cache::forget('admin_latest_orders');
            }

            Log::info('Order Cache Cleared for Order: ' . $event->order->order_code);
        } catch (\Exception $e) {
            Log::error('Failed to clear order cache: ' . $e->getMessage());
        }
    }
}
