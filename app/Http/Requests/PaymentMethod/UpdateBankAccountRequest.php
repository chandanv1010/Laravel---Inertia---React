<?php

namespace App\Http\Requests\PaymentMethod;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBankAccountRequest extends FormRequest
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
            'bank_name' => 'sometimes|required|string|max:255',
            'account_number' => 'sometimes|required|string|max:255',
            'account_holder_name' => 'nullable|string|max:255',
            'note' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'order' => 'nullable|integer',
        ];
    }
}

