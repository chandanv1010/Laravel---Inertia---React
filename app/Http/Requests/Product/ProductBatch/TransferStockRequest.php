<?php

namespace App\Http\Requests\Product\ProductBatch;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;

class TransferStockRequest extends FormRequest
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
            'from_warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'to_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes()
    {
        return [
            'from_warehouse_id' => Lang::get('messages.validation.from_warehouse_id'),
            'to_warehouse_id' => Lang::get('messages.validation.to_warehouse_id'),
            'quantity' => Lang::get('messages.validation.quantity'),
            'reason' => Lang::get('messages.validation.reason'),
        ];
    }
}

