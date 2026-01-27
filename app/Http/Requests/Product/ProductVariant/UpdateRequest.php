<?php

namespace App\Http\Requests\Product\ProductVariant;

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
        $variantId = $this->route('product_variant');
        
        return [
            'product_id' => ($isPatch ? 'sometimes|' : 'required|') . 'exists:products,id',
            'sku' => [
                $isPatch ? 'sometimes' : 'required',
                'string',
                Rule::unique('product_variants', 'sku')->ignore($variantId)
            ],
            'wholesale_price' => 'sometimes|nullable|numeric|min:0',
            'retail_price' => 'sometimes|nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'is_default' => 'sometimes|boolean',
            'image' => 'sometimes|string|nullable',
            'order' => 'sometimes|integer|min:0',
            'publish' => 'sometimes|in:1,2',
            'attributes' => 'sometimes|array',
            'attributes.*' => 'exists:attributes,id',
            'warehouse_stocks' => 'sometimes|array',
            'warehouse_stocks.*.warehouse_id' => 'required|integer|exists:warehouses,id',
            'warehouse_stocks.*.stock_quantity' => 'required|integer|min:0',
            'warehouse_stocks.*.storage_location' => 'nullable|string|max:255',
            'barcode' => 'sometimes|nullable|string|max:255',
            'cost_price' => 'sometimes|nullable|numeric|min:0',
            'compare_price' => 'sometimes|nullable|numeric|min:0',
            'album' => 'sometimes|nullable|array',
            'management_type' => 'sometimes|nullable|in:basic,imei,batch',
            'expired_warning_days' => 'sometimes|nullable|integer|min:0',
            'track_inventory' => 'sometimes|boolean',
            'allow_negative_stock' => 'sometimes|boolean',
            'low_stock_alert' => 'sometimes|nullable|integer|min:0',
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

