<?php

namespace App\Http\Requests\Customer\CustomerCatalogue;

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
            'ids.*' => 'exists:customer_catalogues,id',
            'publish' => 'sometimes|in:1,2',
        ];
    }
}
