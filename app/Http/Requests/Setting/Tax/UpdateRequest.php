<?php

namespace App\Http\Requests\Setting\Tax;

use Illuminate\Foundation\Http\FormRequest;

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
        return [
            'enabled' => 'sometimes|nullable|boolean',
            'price_includes_tax' => 'sometimes|nullable|boolean',
            'default_tax_on_sale' => 'sometimes|nullable|boolean',
            'default_tax_on_purchase' => 'sometimes|nullable|boolean',
            'sale_tax_rate' => 'sometimes|nullable|numeric|min:0|max:100',
            'purchase_tax_rate' => 'sometimes|nullable|numeric|min:0|max:100',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'enabled' => $this->boolean('enabled'),
            'price_includes_tax' => $this->boolean('price_includes_tax'),
            'default_tax_on_sale' => $this->boolean('default_tax_on_sale'),
            'default_tax_on_purchase' => $this->boolean('default_tax_on_purchase'),
            'sale_tax_rate' => $this->input('sale_tax_rate') === '' ? 0 : $this->input('sale_tax_rate'),
            'purchase_tax_rate' => $this->input('purchase_tax_rate') === '' ? 0 : $this->input('purchase_tax_rate'),
        ]);
    }
}
