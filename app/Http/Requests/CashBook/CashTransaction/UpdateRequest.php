<?php

namespace App\Http\Requests\CashBook\CashTransaction;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // When updating, only allow editing description and attachments
        // Other fields cannot be changed - must delete and recreate if needed
        return [
            'description' => 'nullable|string',
            'attachments.*' => 'nullable|image|mimes:jpeg,jpg,png|max:2048',
        ];
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
