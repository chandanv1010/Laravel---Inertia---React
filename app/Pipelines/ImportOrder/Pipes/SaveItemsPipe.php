<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use App\Models\ImportOrderItem;

class SaveItemsPipe extends AbstractImportOrderPipe
{
    public function handle(ImportOrderPayload $payload, \Closure $next): ImportOrderPayload
    {
        if (!$payload->order || !$payload->order->id) {
            return $next($payload);
        }
        
        if (empty($payload->items)) {
            return $next($payload);
        }
        
        // Delete existing items if updating
        ImportOrderItem::where('import_order_id', $payload->order->id)->delete();
        
        // Create new items
        foreach ($payload->items as $index => $item) {
            if (!isset($item['product_id']) && !isset($item['product_variant_id'])) {
                continue;
            }
            
            // Xử lý batch_allocations - convert array to JSON if needed
            $batchAllocations = null;
            if (isset($item['batch_allocations']) && is_array($item['batch_allocations'])) {
                $batchAllocations = json_encode($item['batch_allocations']);
            }
            
            ImportOrderItem::create([
                'import_order_id' => $payload->order->id,
                'product_id' => $item['product_id'] ?? null,
                'product_variant_id' => $item['product_variant_id'] ?? null,
                'quantity' => $item['quantity'] ?? 0,
                'unit_price' => $item['unit_price'] ?? 0,
                'discount' => $item['discount'] ?? 0,
                'discount_type' => $item['discount_type'] ?? 'amount',
                'batch_allocations' => $batchAllocations,
                'total_price' => $item['total_price'] ?? 0,
                'notes' => $item['notes'] ?? null,
                'order' => $index,
            ]);
        }
        
        return $next($payload);
    }
}
