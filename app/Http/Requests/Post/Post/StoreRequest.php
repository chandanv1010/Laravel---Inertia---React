<?php

namespace App\Http\Requests\Post\Post;

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
            'name' => 'required|string',
            'description' => 'nullable|string',
            'content' => 'nullable|string',
            'canonical' => 'required|string|unique:routers,canonical',
            'meta_title' => 'nullable|string',
            'meta_description' => 'nullable|string',
            'post_catalogue_id' => 'nullable|exists:post_catalogues,id',
            'post_catalogues' => 'nullable|array',
            'post_catalogues.*' => 'exists:post_catalogues,id',
            'image' => 'nullable|string',
            'album' => 'nullable|array',
            'order' => 'nullable|integer|min:0',
            'publish' => 'sometimes|in:1,2'
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
