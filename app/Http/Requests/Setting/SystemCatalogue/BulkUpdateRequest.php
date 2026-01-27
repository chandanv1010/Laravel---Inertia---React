<?php

namespace App\Http\Requests\Setting\SystemCatalogue;

use Illuminate\Foundation\Http\FormRequest;

class BulkUpdateRequest extends FormRequest
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
            'ids' => 'required|array',
            'ids.*' => 'exists:system_catalogues,id',
            'publish' => 'sometimes|in:1,2'
        ];
    }
}

