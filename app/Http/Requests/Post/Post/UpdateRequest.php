<?php

namespace App\Http\Requests\Post\Post;

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
     * Rule::unique('posts')->ignore($this->route('post'))
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $postId = $this->route('post');
        
        // Get router for this post
        $router = \App\Models\Router::where('routerable_type', 'App\Models\Post')
            ->where('routerable_id', $postId)
            ->first();
        
        return [
            'name' => 'required|string',
            'description' => 'nullable|string',
            'content' => 'nullable|string',
            'canonical' => $router
                ? "required|string|unique:routers,canonical,{$router->id},id"
                : 'required|string|unique:routers,canonical',
            'meta_title' => 'nullable|string',
            'meta_description' => 'nullable|string',
            'post_catalogue_id' => 'nullable|exists:post_catalogues,id',
            'post_catalogues' => 'nullable|array',
            'post_catalogues.*' => 'exists:post_catalogues,id',
            'image' => 'nullable|string',
            'album' => 'nullable|array',
            'order' => 'nullable|integer|min:0',
            'publish' => 'sometimes|in:1,2'
        ];
    }

    public function attributes()
    {
        return [
            'name' => Lang::get('messages.validation.name'),
            'description' => Lang::get('messages.validation.description'),
            'publish' => Lang::get('messages.validation.publish'),
        ];
    }
}
