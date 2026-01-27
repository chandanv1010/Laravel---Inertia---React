<?php

namespace App\Http\Requests\Banner\Banner;

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
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255|unique:banners,code',
            'position' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'width' => 'nullable|integer|min:0',
            'height' => 'nullable|integer|min:0',
            'publish' => 'sometimes|nullable|in:1,2',
            'order' => 'sometimes|nullable|integer',
            'slides' => 'sometimes|array',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array
     */
    public function attributes(): array
    {
        return [
            'name' => Lang::get('messages.validation.name'),
            'code' => 'Mã banner',
            'position' => 'Vị trí',
            'description' => Lang::get('messages.validation.description'),
            'width' => 'Chiều rộng',
            'height' => 'Chiều cao',
            'publish' => Lang::get('messages.validation.publish'),
            'order' => 'Thứ tự',
            'slides' => 'Slides',
        ];
    }
}

