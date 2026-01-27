<?php

namespace App\Http\Requests\Product\ProductBrand;

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
            'name' => "required|string",
            'description' => 'sometimes|string|nullable',
            'canonical' => 'string|required|unique:product_brand_language|unique:routers',
            'meta_title' => 'sometimes|string|nullable',
            'meta_keyword' => 'sometimes|string|nullable',
            'meta_description' => 'sometimes|string|nullable',
            'image' => 'sometimes|string|nullable',
            'order' => 'sometimes|integer',
            'publish' => 'sometimes|required|in:1,2',
            'robots' => 'sometimes|string|nullable',
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

