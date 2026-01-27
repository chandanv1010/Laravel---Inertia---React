<?php

namespace App\Http\Requests\Product\ProductVariant;

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
            'product_id' => 'required|exists:products,id',
            'sku' => 'required|string|unique:product_variants,sku',
            'wholesale_price' => 'sometimes|nullable|numeric|min:0',
            'retail_price' => 'sometimes|nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'is_default' => 'sometimes|boolean',
            'image' => 'sometimes|string|nullable',
            'order' => 'sometimes|integer',
            'publish' => 'sometimes|required|in:1,2',
            'attributes' => 'sometimes|array',
            'attributes.*' => 'exists:attributes,id'
        ];
    }

    public function attributes()
    {
        return [
            'product_id' => Lang::get('messages.validation.product_id'),
            'sku' => Lang::get('messages.validation.sku'),
            'publish' => Lang::get('messages.validation.publish'),
        ];
    }

}

