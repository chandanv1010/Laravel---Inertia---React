<?php

namespace App\Http\Requests\Warehouse\Supplier;

use Illuminate\Foundation\Http\FormRequest;

class BulkDestroyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids' => 'required|array',
            'ids.*' => 'exists:suppliers,id',
        ];
    }
}
