<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ToggleRequest extends FormRequest
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
            'field' => 'required|in:publish,featured,is_hot,verified,active,robots,is_translatable',
            'value' => 'required'
        ];
    }
    
    protected function prepareForValidation(): void
    {
        // Nếu field là robots, validate value là index hoặc noindex
        if($this->input('field') === 'robots'){
            $this->merge([
                'value' => in_array($this->input('value'), ['index', 'noindex']) ? $this->input('value') : 'index'
            ]);
        } else {
            // Nếu field khác, validate value là 1 hoặc 2
            $this->merge([
                'value' => in_array($this->input('value'), ['1', '2']) ? $this->input('value') : '1'
            ]);
        }
    }
}

/**
 * field,
 * value
 * 
 * 
 */