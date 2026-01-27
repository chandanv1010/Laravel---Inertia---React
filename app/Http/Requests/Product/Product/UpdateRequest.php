<?php

namespace App\Http\Requests\Product\Product;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $productId = $this->route('product');
        
        // Get router for this product
        $router = \App\Models\Router::where('routerable_type', 'App\Models\Product')
            ->where('routerable_id', $productId)
            ->first();
        
        return [
            'name' => 'required',
            'canonical' => $router 
                ? "required|string|unique:routers,canonical,{$router->id},id"
                : 'required|string|unique:routers,canonical',
            'product_catalogue_id' => 'required|exists:product_catalogues,id',
            'cost_price' => 'sometimes|numeric|min:0',
            'retail_price' => 'sometimes|numeric|min:0',
            'wholesale_price' => 'sometimes|numeric|min:0',
            'sku' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:255',
            'unit' => 'nullable|string|max:50',
            'management_type' => 'nullable|in:basic,imei,batch',
            'track_inventory' => 'boolean',
            'allow_negative_stock' => 'boolean',
            'low_stock_alert' => 'nullable|integer|min:0',
            'expired_warning_days' => 'nullable|integer|min:0',
            'apply_tax' => 'boolean',
            'tax_included' => 'boolean',
            'tax_mode' => 'nullable|string',
            'sale_tax_rate' => 'nullable|numeric|min:0|max:100',
            'purchase_tax_rate' => 'nullable|numeric|min:0|max:100',
            'gallery_style' => 'nullable|in:vertical,horizontal',
            'image_aspect_ratio' => 'nullable|string|max:10',
            'image_object_fit' => 'nullable|in:cover,scale-down,auto,contain',
        ];
    }

    protected function prepareForValidation(): void
    {
        // Helper to clean price inputs
        $cleanPrice = fn($val) => $val === '' ? 0 : (is_string($val) ? str_replace(['.', ','], '', $val) : $val);

        $mergeData = [
            'cost_price' => $cleanPrice($this->input('cost_price')),
            'retail_price' => $cleanPrice($this->input('retail_price')),
            'wholesale_price' => $cleanPrice($this->input('wholesale_price')),
            'product_catalogue_id' => $this->input('product_catalogue_id') ?: null,
            'product_brand_id' => $this->input('product_brand_id') ?: null,
            'canonical' => $this->input('canonical') ?: null,
            'track_inventory' => $this->boolean('track_inventory'),
            'allow_negative_stock' => $this->boolean('allow_negative_stock'),
            'apply_tax' => $this->boolean('apply_tax'),
            'tax_included' => $this->boolean('tax_included'),
        ];

        // CRITICAL FIX: Clean pricing_tiers prices
        // Frontend sends "430.000" but PHP floatval treats "." as decimal → 430.0
        // Must strip periods/commas first
        if ($this->has('pricing_tiers') && is_array($this->input('pricing_tiers'))) {
            $cleanedTiers = [];
            foreach ($this->input('pricing_tiers') as $tier) {
                if (is_array($tier)) {
                    $cleanedTier = $tier;
                    if (isset($tier['price'])) {
                        $cleanedTier['price'] = $cleanPrice($tier['price']);
                    }
                    $cleanedTiers[] = $cleanedTier;
                }
            }
            $mergeData['pricing_tiers'] = $cleanedTiers;
        }

        $this->merge($mergeData);
    }
}
