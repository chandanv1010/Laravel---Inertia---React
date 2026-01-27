<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use App\Models\ReturnImportOrderItem;
use Illuminate\Support\Facades\Log;

class SaveReturnItemsPipe extends AbstractReturnImportOrderPipe
{
    public function handle(ReturnImportOrderPayload $payload, \Closure $next): ReturnImportOrderPayload
    {
        if (!$payload->order || !$payload->order->id) {
            return $next($payload);
        }
        
        if (empty($payload->items)) {
            return $next($payload);
        }
        
        // Delete existing items if updating
        ReturnImportOrderItem::where('return_import_order_id', $payload->order->id)->delete();
        
        // Create new items
        foreach ($payload->items as $index => $item) {
            if (empty($item['product_id']) || empty($item['quantity'])) {
                continue;
            }
            
            // Xử lý batch_allocations - convert array to JSON if needed
            $batchAllocations = null;
            if (isset($item['batch_allocations'])) {
                if (is_array($item['batch_allocations'])) {
                    $batchAllocations = json_encode($item['batch_allocations']);
                } elseif (is_string($item['batch_allocations'])) {
                    $batchAllocations = $item['batch_allocations'];
                }
            }
            
            ReturnImportOrderItem::create([
                'return_import_order_id' => $payload->order->id,
                'product_id' => $item['product_id'],
                'product_variant_id' => $item['product_variant_id'] ?? null,
                'quantity' => $item['quantity'] ?? 0,
                'unit_price' => $item['unit_price'] ?? 0,
                'discount' => $item['discount'] ?? 0,
                // Nếu không có discount hoặc discount = 0, set discount_type = 'fixed'
                // 'fixed' = giá cố định, không có discount
                'discount_type' => ($item['discount'] ?? 0) > 0 ? ($item['discount_type'] ?? 'amount') : 'fixed',
                'batch_allocations' => $batchAllocations,
                'total_price' => $item['total_price'] ?? 0,
                'notes' => $item['notes'] ?? null,
                'order' => $index,
            ]);
        }
        
        Log::info('SaveReturnItemsPipe - Items saved', [
            'return_order_id' => $payload->order->id,
            'items_count' => count($payload->items),
        ]);
        
        return $next($payload);
    }
}

