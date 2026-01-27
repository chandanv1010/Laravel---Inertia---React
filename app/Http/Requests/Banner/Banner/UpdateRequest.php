<?php

namespace App\Http\Requests\Banner\Banner;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;
use Illuminate\Validation\Rule;

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
        $method = $this->getMethod();
        $sometimes = $method === 'PATCH' ? 'sometimes' : '';
        $bannerId = $this->route('banner');
        
        return [
            'name' => "required|string|max:255|{$sometimes}",
            'code' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('banners', 'code')->ignore($bannerId),
                $sometimes
            ],
            'position' => "nullable|string|max:255|{$sometimes}",
            'description' => "nullable|string|{$sometimes}",
            'width' => "nullable|integer|min:0|{$sometimes}",
            'height' => "nullable|integer|min:0|{$sometimes}",
            'publish' => "sometimes|nullable|in:1,2|{$sometimes}",
            'order' => "sometimes|nullable|integer|{$sometimes}",
            'slides' => "sometimes|array|{$sometimes}",
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

