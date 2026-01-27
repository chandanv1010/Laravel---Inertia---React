<?php

namespace App\Http\Resources\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class ProductBatchResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $warehouseStocks = $this->whenLoaded('warehouseStocks');
        $totalStock = $warehouseStocks ? $warehouseStocks->sum('stock_quantity') : 0;
        $firstWarehouse = $warehouseStocks ? $warehouseStocks->firstWhere('stock_quantity', '>', 0) : null;
        
        $warehouseDistribution = $warehouseStocks 
            ? $warehouseStocks
                ->where('stock_quantity', '>', 0)
                ->map(function ($ws) {
                    return [
                        'warehouse_id' => $ws->warehouse_id,
                        'warehouse_name' => $ws->warehouse?->name ?? 'Chưa xác định',
                        'stock_quantity' => (int) $ws->stock_quantity,
                    ];
                })
                ->values()
            : collect([]);

        return [
            'id' => $this->id,
            'code' => $this->code,
            'product_id' => $this->product_id,
            'product_variant_id' => $this->product_variant_id,
            'manufactured_at' => $this->manufactured_at?->format('Y-m-d'),
            'expired_at' => $this->expired_at?->format('Y-m-d'),
            'warehouse_id' => $firstWarehouse?->warehouse_id,
            'warehouse_name' => $firstWarehouse?->warehouse?->name ?? null,
            'stock_quantity' => $totalStock,
            'warehouse_distribution' => $warehouseDistribution,
            'is_default' => (bool) $this->is_default,
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

