<?php

namespace App\Http\Requests\Warehouse;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWarehouseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $method = $this->getMethod();
        $sometimes = $method === 'PATCH' ? 'sometimes' : '';
        $warehouseId = $this->route('warehouse');
        
        return [
            'name' => "required|string|max:255|{$sometimes}",
            'code' => "required|string|max:255|unique:warehouses,code,{$warehouseId}|{$sometimes}",
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'manager' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'publish' => 'sometimes|in:1,2',
        ];
    }
}
