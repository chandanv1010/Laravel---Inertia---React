<?php

namespace App\Http\Resources\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class ProductVariantResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'wholesale_price' => $this->wholesale_price ? (float) $this->wholesale_price : null,
            'retail_price' => $this->retail_price ? (float) $this->retail_price : null,
            'cost_price' => $this->cost_price ? (float) $this->cost_price : null,
            'compare_price' => $this->compare_price ? (float) $this->compare_price : null,
            'stock_quantity' => $this->stock_quantity ?? 0,
            'is_default' => $this->is_default ?? false,
            'image' => $this->image,
            'album' => $this->album ?? [],
            'order' => $this->order ?? 0,
            'publish' => $this->publish ?? '1',
            'created_at' => Carbon::parse($this->created_at)->format('d-m-Y'),
            'updated_at' => Carbon::parse($this->updated_at)->format('d-m-Y'),
            // Product relation
            'product' => $this->whenLoaded('product', function(){
                return [
                    'id' => $this->product->id,
                    'name' => $this->product->name ?? 'N/A'
                ];
            }),
            // Attributes relation
            'attributes' => $this->whenLoaded('attributes', function(){
                return $this->attributes->map(function($attribute){
                    return [
                        'id' => $attribute->id,
                        'value' => $attribute->pivot->value ?? $attribute->value ?? 'N/A'
                    ];
                });
            }, []),
            // Warehouse stocks relation
            'warehouse_stocks' => $this->whenLoaded('warehouseStocks', function () {
                return $this->warehouseStocks->map(function ($stock) {
                    return [
                        'warehouse_id' => (int) $stock->warehouse_id,
                        'stock_quantity' => (int) ($stock->stock_quantity ?? 0),
                        'storage_location' => $stock->storage_location,
                    ];
                })->values();
            }, []),
            // Management type và expired_warning_days riêng cho variant
            'management_type' => $this->management_type,
            'expired_warning_days' => $this->expired_warning_days,
            'track_inventory' => $this->track_inventory ?? true,
            'allow_negative_stock' => $this->allow_negative_stock ?? false,
            'low_stock_alert' => $this->low_stock_alert ?? 0,
        ];
    }
}

