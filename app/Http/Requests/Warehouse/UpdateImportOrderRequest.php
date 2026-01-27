<?php

namespace App\Http\Requests\Warehouse;

use Illuminate\Foundation\Http\FormRequest;

class UpdateImportOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('import_order') ?? $this->route('id');
        return [
            'code' => 'sometimes|nullable|string|max:255|unique:import_orders,code,' . $id,
            'supplier_id' => 'sometimes|nullable|exists:suppliers,id',
            'warehouse_id' => 'sometimes|nullable|exists:warehouses,id',
            'responsible_user_id' => 'sometimes|nullable|exists:users,id',
            'expected_import_date' => 'sometimes|nullable|date',
            'reference' => 'sometimes|nullable|string|max:255',
            'notes' => 'sometimes|nullable|string',
            'tags' => 'sometimes|nullable|string|max:500',
            'total_amount' => 'sometimes|nullable|numeric|min:0',
            'discount' => 'sometimes|nullable|numeric|min:0',
            'discount_type' => 'sometimes|nullable|string|in:amount,percent',
            'import_cost' => 'sometimes|nullable|numeric|min:0',
            'import_costs' => 'sometimes|nullable|array',
            'amount_to_pay' => 'sometimes|nullable|numeric|min:0',
            'status' => 'sometimes|nullable|string|in:draft,pending,completed,cancelled',
            'import_to_stock' => 'sometimes|nullable|boolean',
            'payment_status' => 'sometimes|nullable|string|in:paid,unpaid,partial',
            'payment_method' => 'sometimes|nullable|string',
            'payment_amount' => 'sometimes|nullable|numeric|min:0',
            'payment_date' => 'sometimes|nullable|date',
            'payment_reference' => 'sometimes|nullable|string|max:255',
            'items' => 'sometimes|nullable|array',
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
