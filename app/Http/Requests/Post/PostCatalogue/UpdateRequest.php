<?php

namespace App\Http\Requests\Post\PostCatalogue;

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
     * Rule::unique('post_catalogues')->ignore($this->route('post_catalogue'))
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $catalogueId = $this->route('post_catalogue');
        
        // Get router for this catalogue
        $router = \App\Models\Router::where('routerable_type', 'App\Models\PostCatalogue')
            ->where('routerable_id', $catalogueId)
            ->first();
        
        return [
            'name' => 'required|string',
            'canonical' => $router
                ? "required|string|unique:routers,canonical,{$router->id},id"
                : 'required|string|unique:routers,canonical',
            'publish' => 'sometimes|in:1,2'
        ];
    }

    public function attributes()
    {
        return [
            'name' => Lang::get('messages.validation.name'),
            // 'description' => Lang::get('messages.validation.description'),
            'publish' => Lang::get('messages.validation.publish'),
        ];
    }
}
