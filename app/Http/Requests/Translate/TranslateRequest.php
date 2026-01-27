<?php

namespace App\Http\Requests\Translate;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;
use Illuminate\Validation\Rule;

class TranslateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization được xử lý trong controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Lấy các route parameters
        $module = $this->route('module');
        $id = $this->route('id');
        $languageId = $this->route('languageId');
        
        // Tìm router hiện tại để ignore khi validate (nếu đang update cùng record và language)
        $currentRouter = null;
        if ($module && $id && $languageId) {
            // Xác định routerable_type dựa trên module
            $modelClass = match($module) {
                'post' => \App\Models\Post::class,
                'post_catalogue' => \App\Models\PostCatalogue::class,
                default => null
            };
            
            if ($modelClass) {
                // Chỉ tìm router của chính record hiện tại với language_id hiện tại
                // Để ignore khi user update canonical của chính record đó
                $currentRouter = \App\Models\Router::where('routerable_id', $id)
                    ->where('routerable_type', $modelClass)
                    ->where('language_id', $languageId)
                    ->first();
            }
        }
        
        $canonicalRules = [
            'required',
            'string',
            'max:255',
        ];
        
        // Thêm unique rule cho routers table với language_id
        // Unique constraint trong DB là (canonical, language_id)
        // Luôn check unique với language_id, nhưng ignore router hiện tại nếu đang update chính record đó
        if ($currentRouter) {
            // Đang update chính record này: ignore router hiện tại của record này
            // Điều này cho phép user update canonical của chính record mà không bị lỗi duplicate
            // Nhưng vẫn báo lỗi nếu canonical trùng với record khác
            $canonicalRules[] = Rule::unique('routers', 'canonical')
                ->where('language_id', $languageId)
                ->ignore($currentRouter->id, 'id');
        } else {
            // Đang create mới hoặc chưa có router: check unique với language_id (không ignore gì cả)
            // Nếu paste canonical của record khác (cùng language_id), sẽ báo lỗi
            $canonicalRules[] = Rule::unique('routers', 'canonical')
                ->where('language_id', $languageId);
        }
        
        // Kiểm tra xem có phải chỉ update auto_translate không
        $isOnlyAutoTranslate = $this->has('auto_translate') && 
                               !$this->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'meta_keyword', 'meta_description']);
        
        // Kiểm tra method: PATCH thường dùng cho update một phần (như auto_translate)
        // Inertia có thể gửi POST kèm _method=PATCH, nên phải dùng real method.
        $method = strtoupper($this->getRealMethod());
        $isPatch = $method === 'PATCH';
        
        // Nếu là PATCH và chỉ có auto_translate, không require name và canonical
        $isOnlyAutoTranslate = $isPatch && $this->has('auto_translate') && 
                               !$this->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'meta_keyword', 'meta_description']);
        
        return [
            'name' => $isOnlyAutoTranslate ? 'sometimes|nullable|string|max:255' : 'required|string|max:255',
            'canonical' => $isOnlyAutoTranslate ? 'sometimes|nullable|string|max:255' : $canonicalRules,
            'description' => 'sometimes|nullable|string',
            'content' => 'sometimes|nullable|string',
            'meta_title' => 'sometimes|nullable|string|max:255',
            'meta_keyword' => 'sometimes|nullable|string|max:255',
            'meta_description' => 'sometimes|nullable|string',
            'auto_translate' => 'sometimes|boolean',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => Lang::get('messages.validation.name', [], 'vi') ?: 'Tiêu đề',
            'canonical' => Lang::get('messages.validation.canonical', [], 'vi') ?: 'Đường dẫn tĩnh',
            'description' => Lang::get('messages.validation.description', [], 'vi') ?: 'Mô tả',
            'content' => 'Nội dung',
            'meta_title' => 'Meta Title',
            'meta_keyword' => 'Meta Keyword',
            'meta_description' => 'Meta Description',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Tiêu đề là bắt buộc',
            'name.string' => 'Tiêu đề phải là chuỗi',
            'name.max' => 'Tiêu đề không được vượt quá 255 ký tự',
            'canonical.required' => 'Đường dẫn tĩnh là bắt buộc',
            'canonical.string' => 'Đường dẫn tĩnh phải là chuỗi',
            'canonical.max' => 'Đường dẫn tĩnh không được vượt quá 255 ký tự',
            'canonical.unique' => 'Đường dẫn tĩnh này đã tồn tại cho ngôn ngữ này. Vui lòng chọn đường dẫn khác.',
        ];
    }
}
