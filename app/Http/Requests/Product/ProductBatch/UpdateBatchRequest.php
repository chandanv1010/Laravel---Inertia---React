<?php

namespace App\Http\Requests\Product\ProductBatch;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;

class UpdateBatchRequest extends FormRequest
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
            'manufactured_at' => ['nullable', 'date'],
            'expired_at' => ['nullable', 'date'],
            'warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'is_default' => ['nullable', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes()
    {
        return [
            'manufactured_at' => Lang::get('messages.validation.manufactured_at'),
            'expired_at' => Lang::get('messages.validation.expired_at'),
            'warehouse_id' => Lang::get('messages.validation.warehouse_id'),
            'stock_quantity' => Lang::get('messages.validation.stock_quantity'),
        ];
    }
}

