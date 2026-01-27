<?php

namespace App\Http\Requests\Warehouse;

use Illuminate\Foundation\Http\FormRequest;

class StoreImportOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => 'nullable|string|max:255|unique:import_orders,code',
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'responsible_user_id' => 'nullable|exists:users,id',
            'expected_import_date' => 'nullable|date',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'tags' => 'nullable|string|max:500',
            'total_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|string|in:amount,percent',
            'import_cost' => 'nullable|numeric|min:0',
            'import_costs' => 'nullable|array',
            'amount_to_pay' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:draft,pending,completed,cancelled',
            'import_to_stock' => 'nullable|boolean',
            'payment_status' => 'nullable|string|in:paid,unpaid,partial',
            'payment_method' => 'nullable|string',
            'payment_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_reference' => 'nullable|string|max:255',
            'items' => 'nullable|array',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'nullable|integer|min:0',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.discount_type' => 'nullable|string|in:amount,percent',
            'items.*.total_price' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string',
            'items.*.batch_allocations' => 'nullable|array',
            'items.*.batch_allocations.*.batch_id' => 'nullable|integer|exists:product_batches,id',
            'items.*.batch_allocations.*.batch_code' => 'nullable|string',
            'items.*.batch_allocations.*.quantity' => 'nullable|integer|min:0',
        ];
    }
}
