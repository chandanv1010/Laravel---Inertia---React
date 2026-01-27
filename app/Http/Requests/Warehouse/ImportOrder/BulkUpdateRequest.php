<?php

namespace App\Http\Requests\Warehouse\ImportOrder;

use Illuminate\Foundation\Http\FormRequest;

class BulkUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids' => 'required|array',
            'ids.*' => 'required|exists:import_orders,id',
            'status' => 'sometimes|string|in:draft,pending,completed,cancelled',
        ];
    }
}
