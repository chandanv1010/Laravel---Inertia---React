<?php

namespace App\Http\Requests\PaymentMethod;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePaymentMethodRequest extends FormRequest
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
        $id = $this->route('payment_method') ?? $this->route('id');
        
        return [
            'name' => 'sometimes|required|string|max:255',
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('payment_methods', 'code')->ignore($id)],
            'status' => 'sometimes|in:active,inactive',
            'description' => 'nullable|string',
            'order' => 'nullable|integer',
            'is_default' => 'sometimes|boolean',
        ];
    }
}

