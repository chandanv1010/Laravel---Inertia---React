<?php

namespace App\Http\Requests\Warehouse;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255|unique:suppliers,code',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'tax_code' => 'nullable|string|max:255',
            'fax' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:500',
            'responsible_user_id' => 'nullable|exists:users,id',
            'publish' => 'sometimes|required|in:1,2',
        ];
    }
}
