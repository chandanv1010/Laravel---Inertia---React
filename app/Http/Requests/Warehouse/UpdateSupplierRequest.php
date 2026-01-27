<?php

namespace App\Http\Requests\Warehouse;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $method = $this->getMethod();
        $supplierId = $this->route('supplier');
        
        // Với PATCH method, 'name' không bắt buộc (cho phép update partial)
        $nameRule = $method === 'PATCH' ? 'sometimes|string|max:255' : 'required|string|max:255';
        
        return [
            'name' => $nameRule,
            'code' => "nullable|string|max:255|unique:suppliers,code,{$supplierId}",
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'tax_code' => 'nullable|string|max:255',
            'fax' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:500',
            'responsible_user_id' => 'nullable|exists:users,id',
            'publish' => 'sometimes|in:1,2',
        ];
    }
}
