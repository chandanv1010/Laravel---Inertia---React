<?php

namespace App\Http\Requests\Image;

use Illuminate\Foundation\Http\FormRequest;

class ImageTempUploadRequest extends FormRequest
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

        $config = config('upload.image');

        return [
            'file' => [
                'required',
                'file',
                'image',
                'max:'.$config['max_size'],
                'mimes:'.implode(',', $config['allow_mime_types'])
            ],
            'session_id' => 'required|string'
        ];
    }
}
