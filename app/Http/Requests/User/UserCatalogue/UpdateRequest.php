<?php

namespace App\Http\Requests\User\UserCatalogue;

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
        return [
            'name' => "required|string|{$sometimes}",
            'canonical' => [
                $sometimes,
                "required",
                "string",
                Rule::unique('user_catalogues')->ignore($this->route('user_catalogue'))
            ],
            'description' => 'sometimes|string',
            'publish' => 'sometimes|in:1,2'
        ];
    }

    public function attributes()
    {
        return [
            'name' => Lang::get('messages.user_catalogue.name'),
            'canonical' => Lang::get('messages.user_catalogue.canonical'),
            'description' => Lang::get('messages.description')
        ];
    }
}
