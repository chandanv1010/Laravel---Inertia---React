<?php

namespace App\Http\Requests\Permission\Permission;

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
     * Rule::unique('permissions')->ignore($this->route('permission'))
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {

        $method = $this->getMethod();
        $sometimes = $method === 'PATCH' ? 'sometimes' : '';
        return [
            'name' => "required|string|{$sometimes}",
            // 'description' => 'sometimes|string',
            'publish' => 'sometimes|in:1,2',
            'canonical' => [
                $sometimes,
                "required",
                "string",
                Rule::unique('user_catalogues')->ignore($this->route('user_catalogue'))
            ],
        ];
    }

    public function attributes()
    {
        return [
            'name' => Lang::get('messages.validation.name'),
            // 'description' => Lang::get('messages.validation.description'),
            'publish' => Lang::get('messages.validation.publish'),
            'canonical' => Lang::get('messages.validation.canonical'),
        ];
    }
}
