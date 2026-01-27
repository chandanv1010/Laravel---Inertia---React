<?php

namespace App\Http\Requests\PaymentMethod;

use Illuminate\Foundation\Http\FormRequest;

class StoreBankAccountRequest extends FormRequest
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
            'payment_method_id' => 'required|exists:payment_methods,id',
            'bank_name' => 'required|string|max:255',
            'bank_bin' => 'nullable|string|max:20',
            'account_number' => 'required|string|max:255',
            'account_holder_name' => 'nullable|string|max:255',
            'note' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'order' => 'nullable|integer',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('bank_bin')) {
            $this->merge([
                'bank_bin' => $this->input('bank_bin'),
            ]);
        }
    }
}

