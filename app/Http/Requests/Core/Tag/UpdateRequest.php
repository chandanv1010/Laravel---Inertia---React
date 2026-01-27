<?php

namespace App\Http\Requests\Core\Tag;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;
use Illuminate\Validation\Rule;

class UpdateRequest extends FormRequest
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
        $method = $this->getMethod();
        $sometimes = $method === 'PATCH' ? 'sometimes' : '';
        $tagId = $this->route('tag');
        
        return [
            'name' => "required|string|max:255|{$sometimes}",
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('tags', 'slug')->ignore($tagId),
                $sometimes
            ],
            'type' => "nullable|string|max:50|{$sometimes}",
            'description' => "nullable|string|{$sometimes}",
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

