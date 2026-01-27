<?php

namespace App\Http\Requests\Customer\CustomerCatalogue;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;

class StoreRequest extends FormRequest
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
            'name' => "required|string|max:255",
            'description' => 'sometimes|nullable|string',
            'order' => 'sometimes|nullable|integer',
            'publish' => 'nullable|in:1,2'
        ];
    }

    public function attributes()
    {
        return [
            'name' => Lang::get('messages.validation.name'),
            'description' => Lang::get('messages.validation.description'),
            'order' => 'Thứ tự',
            'publish' => Lang::get('messages.validation.publish'),
        ];
    }
}
