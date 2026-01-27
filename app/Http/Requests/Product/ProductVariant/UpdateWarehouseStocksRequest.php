<?php

namespace App\Http\Requests\Product\ProductVariant;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWarehouseStocksRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'warehouse_stocks' => ['required', 'array'],
            'warehouse_stocks.*.warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'warehouse_stocks.*.stock_quantity' => ['required', 'integer', 'min:0'],
            'warehouse_stocks.*.storage_location' => ['nullable', 'string', 'max:255'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
