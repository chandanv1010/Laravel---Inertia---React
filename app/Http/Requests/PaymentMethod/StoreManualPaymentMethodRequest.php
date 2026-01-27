<?php

namespace App\Http\Requests\PaymentMethod;

use Illuminate\Foundation\Http\FormRequest;

class StoreManualPaymentMethodRequest extends FormRequest
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
            'payment_instructions' => 'nullable|string',
            'allow_use_when_paying' => 'sometimes|boolean',
            'create_receipt_immediately' => 'sometimes|boolean',
            'beneficiary_account_id' => 'nullable|exists:bank_accounts,id',
            'beneficiary_account_ids' => 'nullable|array',
            'beneficiary_account_ids.*' => 'exists:bank_accounts,id',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('beneficiary_account_ids') && is_array($this->input('beneficiary_account_ids'))) {
            $this->merge([
                'beneficiary_account_ids' => array_map('intval', $this->input('beneficiary_account_ids')),
            ]);
        }
    }
}

