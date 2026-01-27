<?php

namespace App\Http\Requests\Core\Tag;

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
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:tags,slug',
            'type' => 'nullable|string|max:50',
            'description' => 'nullable|string',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array
     */
    public function attributes(): array
    {
        return [
            'name' => Lang::get('messages.validation.name'),
            'slug' => 'Slug',
            'type' => 'Loại',
            'description' => Lang::get('messages.validation.description'),
        ];
    }
}

