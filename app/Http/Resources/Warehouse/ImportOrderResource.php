<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ImportOrderResource extends JsonResource
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
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->whenLoaded('supplier', function() {
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
            'expected_import_date' => $this->expected_import_date,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'tags' => $this->tags,
            'total_amount' => $this->total_amount,
            'discount' => $this->discount,
            'discount_type' => $this->discount_type ?? 'amount',
            'import_cost' => $this->import_cost,
            'import_costs' => $this->import_costs ? (is_string($this->import_costs) ? json_decode($this->import_costs, true) : $this->import_costs) : [],
            'amount_to_pay' => $this->amount_to_pay,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'payment_amount' => $this->payment_amount,
            'user_id' => $this->user_id,
            'creators' => $this->whenLoaded('creators'),
            'items' => $this->whenLoaded('items', function() {
                return $this->items->map(function($item) {
                    // Lấy product name
                    $productName = 'N/A';
                    if ($item->relationLoaded('product') && $item->product) {
                        $product = $item->product;
                        // Lấy name từ current_languages nếu có
                        if ($product->relationLoaded('current_languages') && $product->current_languages->isNotEmpty()) {
                            $productName = $product->current_languages->first()->pivot->name ?? 'N/A';
                        } elseif ($product->relationLoaded('languages') && $product->languages->isNotEmpty()) {
                            $productName = $product->languages->first()->pivot->name ?? 'N/A';
                        } else {
                            // Fallback: thử lấy từ property name nếu có
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
                        'returned_quantity' => $item->returned_quantity ?? 0,
                        'remaining_quantity' => $item->remaining_quantity ?? 0,
                    ];
                });
            }),
            'history' => $this->whenLoaded('history', function() {
                return $this->history->map(function($item) {
                    // Format action thành tiếng Việt có nghĩa
                    $actionText = $item->action;
                    $data = is_string($item->data) ? json_decode($item->data, true) : ($item->data ?? []);
                    
                    switch ($item->action) {
                        case 'payment':
                            $amount = $data['amount'] ?? 0;
                            $totalPaid = $data['total_paid'] ?? 0;
                            $remaining = $data['remaining'] ?? 0;
                            if ($remaining <= 0) {
                                $actionText = 'Đã thanh toán toàn bộ';
                            } else {
                                $actionText = 'Đã thanh toán: ' . number_format($amount, 0, ',', '.') . 'đ';
                            }
                            break;
                        case 'created':
                            $actionText = 'Tạo đơn nhập hàng';
                            break;
                        case 'updated':
                            $actionText = 'Cập nhật đơn nhập hàng';
                            break;
                        case 'import_to_stock':
                        case 'imported':
                            $actionText = 'Nhập kho thành công';
                            break;
                        case 'cancelled':
                            $actionText = 'Hủy đơn nhập hàng';
                            break;
                        case 'restored':
                            $actionText = 'Khôi phục đơn nhập hàng';
                            break;
                    }
                    
                    return [
                        'id' => $item->id,
                        'action' => $actionText,
                        'description' => $item->description,
                        'user' => $item->user ? [
                            'id' => $item->user->id,
                            'name' => $item->user->name,
                        ] : null,
                        'created_at' => $item->created_at ? $item->created_at->format('d-m-Y') : null,
                        'created_at_time' => $item->created_at ? $item->created_at->format('H:i') : null,
                    ];
                });
            }),
            'created_at' => $this->created_at ? $this->created_at->format('d-m-Y') : ($this->created_at ?? null),
            'created_at_datetime' => $this->created_at ? $this->created_at->format('d-m-Y H:i') : ($this->created_at ?? null),
            'updated_at' => $this->updated_at,
        ];
    }
}
