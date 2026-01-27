<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReturnImportOrderResource extends JsonResource
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
            'code' => $this->code,
            'import_order_id' => $this->import_order_id,
            'importOrder' => $this->whenLoaded('importOrder', function () {
                return $this->importOrder ? [
                    'id' => $this->importOrder->id,
                    'code' => $this->importOrder->code,
                ] : null;
            }),
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->whenLoaded('supplier', function () {
                return $this->supplier ? [
                    'id' => $this->supplier->id,
                    'name' => $this->supplier->name,
                    'email' => $this->supplier->email ?? null,
                    'phone' => $this->supplier->phone ?? null,
                    'address' => $this->supplier->address ?? null,
                ] : null;
            }),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse'),
            'responsible_user_id' => $this->responsible_user_id,
            'responsibleUser' => $this->whenLoaded('responsibleUser'),
            'return_type' => $this->return_type,
            'return_reason' => $this->return_reason,
            'total_amount' => $this->total_amount,
            'discount' => $this->discount,
            'return_cost' => $this->return_cost,
            'deduction' => $this->deduction,
            'refund_amount' => $this->refund_amount,
            'refund_status' => $this->refund_status,
            'export_to_stock' => $this->export_to_stock,
            'status' => $this->status,
            'notes' => $this->notes,
            'tags' => $this->tags,
            'user_id' => $this->user_id,
            'creators' => $this->whenLoaded('creators'),
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(function ($item) {
                    // Lấy product name
                    $productName = 'N/A';
                    if ($item->relationLoaded('product') && $item->product) {
                        $product = $item->product;
                        if ($product->relationLoaded('current_languages') && $product->current_languages->isNotEmpty()) {
                            $productName = $product->current_languages->first()->pivot->name ?? 'N/A';
                        } elseif ($product->relationLoaded('languages') && $product->languages->isNotEmpty()) {
                            $productName = $product->languages->first()->pivot->name ?? 'N/A';
                        } else {
                            $productName = $product->name ?? 'N/A';
                        }

                        // Nếu có variant, thêm variant name
                        if ($item->product_variant_id && $item->relationLoaded('productVariant') && $item->productVariant) {
                            $variant = $item->productVariant;
                            if ($variant->relationLoaded('attributes') && $variant->attributes->isNotEmpty()) {
                                $variantNameParts = [];
                                foreach ($variant->attributes as $attribute) {
                                    $value = $attribute->pivot->value ?? $attribute->value ?? null;
                                    if ($value && trim($value)) {
                                        $variantNameParts[] = trim($value);
                                    }
                                }
                                if (!empty($variantNameParts)) {
                                    $variantName = implode(' / ', $variantNameParts);
                                    $productName = $productName . ' - ' . $variantName;
                                }
                            }
                        }
                    }

                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_variant_id' => $item->product_variant_id,
                        'product_name' => $productName,
                        'product_image' => $item->relationLoaded('product') && $item->product ? $item->product->image : null,
                        'product_sku' => $item->relationLoaded('product') && $item->product ? $item->product->sku : null,
                        'variant_sku' => $item->relationLoaded('productVariant') && $item->productVariant ? $item->productVariant->sku : null,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'total_price' => $item->total_price,
                        'notes' => $item->notes,
                        'discount' => $item->discount,
                        'discount_type' => $item->discount_type,
                        'management_type' => $item->relationLoaded('product') && $item->product ? $item->product->management_type : 'basic',
                        'batch_allocations' => $item->batch_allocations,
                    ];
                });
            }),
            'created_at' => $this->created_at ? $this->created_at->format('d-m-Y') : null,
            'created_at_datetime' => $this->created_at ? $this->created_at->format('d-m-Y H:i') : null,
            'updated_at' => $this->updated_at,
        ];
    }
}
