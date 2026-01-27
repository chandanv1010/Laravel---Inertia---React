<?php

namespace App\Http\Requests\CashBook\CashReason;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'type' => 'required|in:receipt,payment',
            'description' => 'nullable|string',
            'is_default' => 'nullable|boolean',
            'publish' => 'nullable|string|in:1,2',
            'order' => 'nullable|integer|min:0',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'Tên lý do',
            'type' => 'Loại',
            'description' => 'Mô tả',
        ];
    }
}
