<?php

namespace App\Http\Requests\Customer\Customer;

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
            'ids.*' => 'exists:customers,id',
            'publish' => 'sometimes|in:1,2',
        ];
    }
}
