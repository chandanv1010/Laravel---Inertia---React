<?php

namespace App\Http\Requests\Setting\Language;

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
     * Rule::unique('languages')->ignore($this->route('language'))
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {

        $method = $this->getMethod();
        $sometimes = $method === 'PATCH' ? 'sometimes' : '';
        return [
            'name' => "required|string|{$sometimes}",
            'description' => 'sometimes|string',
            'canonical' => [
                $sometimes,
                "required",
                "string",
                Rule::unique('languages')->ignore($this->route('language'))
            ],
            'image' => 'required',
            'publish' => 'sometimes|in:1,2'
        ];
    }

    public function attributes()
    {
        return [
            'name' => Lang::get('messages.validation.name'),
            'description' => Lang::get('messages.validation.description'),
            'publish' => Lang::get('messages.validation.publish'),
            'canonical' => Lang::get('message.validation.canonical'),
            'image' => Lang::get('message.validation.image'),
        ];
    }
}
