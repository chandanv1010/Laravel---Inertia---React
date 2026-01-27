<?php

namespace App\Http\Requests\User\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Str;

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
            'name'  => "required|string",
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
            'password_confirm' => 'same:password',
            'user_catalogues' => 'required|array',
            'user_catalogues.*' => 'exists:user_catalogues,id',
            'description' => 'sometimes|string',
            'publish' => 'sometimes|required|in:1,2'
        ];
    }

    public function attributes()
    {
        return [
            'name' => Lang::get('messages.validation.name'),
            'description' => Lang::get('messages.validation.description'),
            'publish' => Lang::get('messages.validation.publish'),
        ];
    }

}
