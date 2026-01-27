<?php

namespace App\Http\Requests\Product\ProductBatch;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;

class StoreBatchesRequest extends FormRequest
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
            'items' => ['required', 'array', 'min:1'],
            'items.*.code' => ['required', 'string', 'max:255'],
            'items.*.manufactured_at' => ['nullable', 'date'],
            'items.*.expired_at' => ['nullable', 'date'],
            'items.*.warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'items.*.stock_quantity' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function attributes()
    {
        return [
            'items' => Lang::get('messages.validation.items'),
            'items.*.code' => Lang::get('messages.validation.code'),
        ];
    }
}

