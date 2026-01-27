<?php

namespace App\Http\Requests\Customer\Customer;

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
            // Thông tin cơ bản
            'last_name' => 'required|string|max:255',
            'first_name' => 'required|string|max:255',
            'email' => 'required|email|unique:customers,email|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
            'date_of_birth' => 'sometimes|nullable|date|before:today',
            'gender' => 'sometimes|nullable|in:male,female,other',
            'receive_promotional_emails' => 'nullable|boolean',
            
            // Địa chỉ nhận hàng
            'shipping_last_name' => 'sometimes|nullable|string|max:255',
            'shipping_first_name' => 'sometimes|nullable|string|max:255',
            'shipping_company' => 'sometimes|nullable|string|max:255',
            'shipping_phone' => 'sometimes|nullable|string|max:20',
            'shipping_country' => 'sometimes|nullable|string|max:100',
            'shipping_postal_code' => 'sometimes|nullable|string|max:20',
            'shipping_province' => 'sometimes|nullable|string|max:255',
            'shipping_district' => 'sometimes|nullable|string|max:255',
            'shipping_ward' => 'sometimes|nullable|string|max:255',
            'shipping_address' => 'sometimes|nullable|string',
            'use_new_address_format' => 'nullable|boolean',
            
            // Nhóm khách hàng và ghi chú
            'customer_catalogue_id' => 'sometimes|nullable|exists:customer_catalogues,id',
            'notes' => 'sometimes|nullable|string',
            
            'publish' => 'nullable|in:1,2'
        ];
    }

    public function attributes()
    {
        return [
            'last_name' => 'Họ',
            'first_name' => 'Tên',
            'email' => 'Email',
            'phone' => 'Số điện thoại',
            'date_of_birth' => 'Ngày sinh',
            'gender' => 'Giới tính',
            'receive_promotional_emails' => 'Nhận email quảng cáo',
            'shipping_last_name' => 'Họ (địa chỉ nhận hàng)',
            'shipping_first_name' => 'Tên (địa chỉ nhận hàng)',
            'shipping_company' => 'Công ty',
            'shipping_phone' => 'Số điện thoại (địa chỉ nhận hàng)',
            'shipping_country' => 'Quốc gia',
            'shipping_postal_code' => 'Postal/Zipcode',
            'shipping_province' => 'Tỉnh/Thành phố',
            'shipping_district' => 'Quận/Huyện',
            'shipping_ward' => 'Phường/Xã',
            'shipping_address' => 'Địa chỉ cụ thể',
            'use_new_address_format' => 'Địa chỉ mới',
            'customer_catalogue_id' => 'Nhóm khách hàng',
            'notes' => 'Ghi chú',
            'publish' => Lang::get('messages.validation.publish'),
        ];
    }
}
