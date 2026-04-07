<?php

namespace App\Listeners\Admin;

use App\Events\Frontend\Checkout\OrderCreated;
use App\Events\Admin\Order\OrderUpdated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ClearOrderDashboardCache implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the events.
     */
    public function handle(OrderCreated|OrderUpdated $event): void
    {
        try {
            // Xóa toàn bộ cache thuộc bộ thẻ 'orders_admin' và 'orders'
            if (Cache::supportsTags()) {
                Cache::tags(['orders_admin', 'orders'])->flush();
            } else {
                // Fallback cho file driver
                Cache::forget('admin_order_stats');
                Cache::forget('admin_latest_orders');
            }

            Log::info('Order Cache Cleared for Order: ' . $event->order->order_code);
        } catch (\Exception $e) {
            Log::error('Failed to clear order cache: ' . $e->getMessage());
        }
    }
}
