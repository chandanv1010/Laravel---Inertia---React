<?php

namespace App\Http\Requests\Product\ProductBrand;

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
        $isPatch = $method === 'PATCH';
        $productBrandId = $this->route('product_brand');
        
        return [
            'name' => $isPatch ? 'sometimes|string' : 'required|string',
            'description' => 'sometimes|string|nullable',
            'canonical' => [
                $isPatch ? 'sometimes' : 'required',
                'string',
                "unique:product_brand_language,canonical,{$productBrandId},product_brand_id",
                "unique:routers,canonical,{$productBrandId},routerable_id"
            ],
            'meta_title' => 'sometimes|string|nullable',
            'meta_keyword' => 'sometimes|string|nullable',
            'meta_description' => 'sometimes|string|nullable',
            'image' => 'sometimes|string|nullable',
            'order' => 'sometimes|integer|min:0',
            'publish' => 'sometimes|in:1,2',
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

