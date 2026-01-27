<?php

namespace App\Http\Requests\CashBook\CashTransaction;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'transaction_type' => 'required|in:receipt,payment,transfer',
            'payment_method' => 'required|in:cash,bank',
            'reason_id' => 'required|exists:cash_reasons,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'transaction_date' => 'required|date',
            'reference_code' => 'nullable|string|max:255',
            'attachments.*' => 'nullable|image|mimes:jpeg,jpg,png|max:2048',
            'publish' => 'nullable|string|in:1,2',
        ];

        // Add conditional validation based on transaction type
        $transactionType = $this->input('transaction_type');

        if (in_array($transactionType, ['receipt', 'payment'])) {
            $rules['partner_group'] = 'nullable|string';
            $rules['partner_id'] = 'nullable|integer';
            $rules['partner_name'] = 'nullable|string|max:255';
            $rules['store_id'] = 'required|exists:stores,id';
        }

        if ($transactionType === 'transfer') {
            $rules['store_id'] = 'required|exists:stores,id';
            $rules['recipient_store_id'] = 'required|exists:stores,id|different:store_id';
        }

        return $rules;
    }

    public function attributes(): array
    {
        return [
            'transaction_type' => 'Loại phiếu',
            'payment_method' => 'Phương thức thanh toán',
            'reason_id' => 'Lý do',
            'amount' => 'Số tiền',
            'description' => 'Diễn giải',
            'transaction_date' => 'Ngày giao dịch',
            'reference_code' => 'Mã tham chiếu',
            'store_id' => 'Chi nhánh',
            'recipient_store_id' => 'Chi nhánh nhận',
        ];
    }

    public function messages(): array
    {
        return [
            'recipient_store_id.different' => 'Chi nhánh nhận phải khác chi nhánh xuất quỹ',
        ];
    }
}
