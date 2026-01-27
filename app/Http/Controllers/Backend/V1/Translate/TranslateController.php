<?php   
namespace App\Http\Controllers\Backend\V1\Translate;

use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use App\Services\Interfaces\Setting\LanguageServiceInterface as LanguageService;
use App\Services\Interfaces\Translate\TranslateServiceInterface as TranslateService;
use App\Http\Requests\Translate\TranslateRequest;
use Illuminate\Support\Facades\Lang;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Str;

class TranslateController extends BaseController
{
    use AuthorizesRequests;

    private $languageService;
    private $translateService;

    public function __construct(
        LanguageService $languageService,
        TranslateService $translateService
    )
    {
        $this->languageService = $languageService;
        $this->translateService = $translateService;
        parent::__construct(null); // TranslateController không cần service riêng
    }

    /**
     * Hiển thị form tạo mới bản dịch
     * Route: GET /backend/{module}/{id}/translate/{languageId}
     *
     * @param Request $request
     * @param string $module
     * @param int $id
     * @param int|string $languageId
     * @return Response
     */
    public function create(Request $request, string $module, int $id, int|string $languageId): Response
    {
        $this->authorize('modules', "{$module}:update");
        
        $languageId = (int) $languageId;
        
        $service = $this->resolveService($module);
        if (!$service) {
            abort(404, "Module {$module} not found");
        }

        $record = $service->show($id);
        $language = $this->languageService->show($languageId);
        
        if (!$record || !$language) {
            abort(404);
        }

        $translationData = $this->translateService->getTranslationData($module, $id, $languageId);
        if ($translationData === null) {
            $translationData = [];
        }
        
        $defaultData = $this->translateService->getDefaultTranslationData($module, $id);
        if ($defaultData === null) {
            $defaultData = [];
        }
        
        $languages = $this->languageService->paginate(new Request(['type' => 'all', 'publish' => '2']));
        
        $resourceClass = $this->resolveResourceClass($module);
        
        $fieldsConfig = $this->getFieldsConfig($module);
        
        $autoTranslate = $record->auto_translate ?? false;
        if (!is_array($translationData)) {
            $translationData = [];
        }
        $translationData['auto_translate'] = $autoTranslate;
        
        $defaultLanguage = $this->languageService->show((int)config('app.language_id'));
        $defaultLocale = $defaultLanguage ? $defaultLanguage->canonical : config('app.locale', 'vi');
        
        return Inertia::render('backend/translate/translate', [
            'module' => $module,
            'record' => $resourceClass ? new $resourceClass($record) : $record,
            'language' => [
                'id' => $language->id,
                'name' => $language->name,
                'canonical' => $language->canonical,
                'image' => $language->image,
            ],
            'translationData' => $translationData,
            'defaultData' => $defaultData,
            'defaultLocale' => $defaultLocale,
            'languages' => $languages,
            'fieldsConfig' => $fieldsConfig,
        ]);
    }

    /**
     * Lưu bản dịch mới
     * Route: POST /backend/{module}/{id}/translate/{languageId}
     *
     * @param TranslateRequest $request
     * @param string $module
     * @param int $id
     * @param int|string $languageId
     * @return RedirectResponse
     */
    public function store(TranslateRequest $request, string $module, int $id, int|string $languageId): RedirectResponse
    {
        $this->authorize('modules', "{$module}:update");
        
        $languageId = (int) $languageId;
        
        $service = $this->resolveService($module);
        if (!$service) {
            abort(404, "Module {$module} not found");
        }

        $translationData = $request->only([
            'name',
            'description',
            'content',
            'canonical',
            'meta_title',
            'meta_keyword',
            'meta_description',
            'auto_translate',
        ]);
        
        try {
            $result = $this->translateService->saveTranslation($module, $id, $languageId, $translationData);
        } catch (\Throwable $th) {
            $message = $th->getMessage() ?: Lang::get('messages.save_failed');
            $field = str_contains($message, 'Canonical') ? 'canonical' : 'name';
            return redirect()->back()->withErrors([$field => $message]);
        }
        
        if ($result) {
            if (method_exists($service, 'invalidateCache')) {
                $record = $service->show($id);
                if ($record) {
                    $service->findById($id);
                }
                $service->invalidateCache();
            } elseif (method_exists($service, 'clearModuleCache')) {
                $service->clearModuleCache();
            }
            
            if ($request->input('redirect_to') === 'list') {
                $routePrefix = match($module) {
                    'post' => 'post.index',
                    'post_catalogue' => 'post_catalogue.index',
                    'product' => 'product.index',
                    'product_catalogue' => 'product_catalogue.index',
                    default => "{$module}.index"
                };
                
                return redirect()->route($routePrefix)->with('success', Lang::get('messages.save_success'));
            }
            
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Hiển thị form chỉnh sửa bản dịch
     * Route: GET /backend/{module}/{id}/translate/{languageId}/edit
     *
     * @param Request $request
     * @param string $module
     * @param int $id
     * @param int|string $languageId
     * @return Response
     */
    public function edit(Request $request, string $module, int $id, int|string $languageId): Response
    {
        return $this->create($request, $module, $id, $languageId);
    }

    /**
     * Cập nhật bản dịch
     * Route: PUT/PATCH /backend/{module}/{id}/translate/{languageId}
     *
     * @param TranslateRequest $request
     * @param string $module
     * @param int $id
     * @param int|string $languageId
     * @return RedirectResponse|JsonResponse
     */
    public function update(TranslateRequest $request, string $module, int $id, int|string $languageId): RedirectResponse|JsonResponse
    {
        $this->authorize('modules', "{$module}:update");
        
        $languageId = (int) $languageId;
        
        $service = $this->resolveService($module);
        if (!$service) {
            abort(404, "Module {$module} not found");
        }

        $translationData = $request->only([
            'name',
            'description',
            'content',
            'canonical',
            'meta_title',
            'meta_keyword',
            'meta_description',
            'auto_translate',
        ]);
        
        try {
            $result = $this->translateService->saveTranslation($module, $id, $languageId, $translationData);
        } catch (\Throwable $th) {
            $message = $th->getMessage() ?: Lang::get('messages.save_failed');
            $field = str_contains($message, 'Canonical') ? 'canonical' : 'name';

            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'errors' => [$field => [$message]],
                ], 422);
            }

            return redirect()->back()->withErrors([$field => $message]);
        }
        
        if ($result) {
            $record = $service->show($id);
            
            if (method_exists($service, 'invalidateCache')) {
                if ($record) {
                    $service->findById($id);
                }
                $service->invalidateCache();
            } elseif (method_exists($service, 'clearModuleCache')) {
                $service->clearModuleCache();
            }
            
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => Lang::get('messages.save_success'),
                    'auto_translate' => $record->auto_translate ?? false
                ]);
            }
            
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Resolve service class từ module name
     *
     * @param string $module
     * @return object|null
     */
    private function resolveService(string $module): ?object
    {
        $serviceMap = [
            'post' => \App\Services\Interfaces\Post\PostServiceInterface::class,
            'post_catalogue' => \App\Services\Interfaces\Post\PostCatalogueServiceInterface::class,
            'product' => \App\Services\Interfaces\Product\ProductServiceInterface::class,
            'product_catalogue' => \App\Services\Interfaces\Product\ProductCatalogueServiceInterface::class,
            'product_brand' => \App\Services\Interfaces\Product\ProductBrandServiceInterface::class,
        ];

        $serviceClass = $serviceMap[$module] ?? null;
        if (!$serviceClass) {
            return null;
        }

        return app($serviceClass);
    }

    /**
     * Resolve resource class từ module name
     *
     * @param string $module
     * @return string|null
     */
    private function resolveResourceClass(string $module): ?string
    {
        $resourceMap = [
            'post' => \App\Http\Resources\Post\PostResource::class,
            'post_catalogue' => \App\Http\Resources\Post\PostCatalogueResource::class,
            'product' => \App\Http\Resources\Product\ProductResource::class,
            'product_catalogue' => \App\Http\Resources\Product\ProductCatalogueResource::class,
            'product_brand' => \App\Http\Resources\Product\ProductBrandResource::class,
        ];

        return $resourceMap[$module] ?? null;
    }

    /**
     * Lấy fields config cho module
     *
     * @param string $module
     * @return array
     */
    private function getFieldsConfig(string $module): array
    {
        $configs = [
            'post' => [
                ['key' => 'name', 'label' => 'Tiêu đề', 'type' => 'input', 'required' => true],
                ['key' => 'description', 'label' => 'Mô tả', 'type' => 'editor'],
                ['key' => 'content', 'label' => 'Nội dung', 'type' => 'editor'],
                ['key' => 'canonical', 'label' => 'Đường dẫn tĩnh', 'type' => 'input'],
                ['key' => 'meta_title', 'label' => 'Meta Title', 'type' => 'input'],
                ['key' => 'meta_keyword', 'label' => 'Meta Keyword', 'type' => 'input'],
                ['key' => 'meta_description', 'label' => 'Meta Description', 'type' => 'textarea', 'rows' => 3],
            ],
            'post_catalogue' => [
                ['key' => 'name', 'label' => 'Tên nhóm', 'type' => 'input', 'required' => true],
                ['key' => 'description', 'label' => 'Mô tả', 'type' => 'textarea', 'rows' => 4],
                ['key' => 'content', 'label' => 'Nội dung', 'type' => 'editor'],
                ['key' => 'canonical', 'label' => 'Đường dẫn tĩnh', 'type' => 'input'],
                ['key' => 'meta_title', 'label' => 'Meta Title', 'type' => 'input'],
                ['key' => 'meta_keyword', 'label' => 'Meta Keyword', 'type' => 'input'],
                ['key' => 'meta_description', 'label' => 'Meta Description', 'type' => 'textarea', 'rows' => 3],
            ],
            'product' => [
                ['key' => 'name', 'label' => 'Tên sản phẩm', 'type' => 'input', 'required' => true],
                ['key' => 'description', 'label' => 'Mô tả', 'type' => 'editor'],
                ['key' => 'content', 'label' => 'Nội dung', 'type' => 'editor'],
                ['key' => 'canonical', 'label' => 'Đường dẫn tĩnh', 'type' => 'input'],
                ['key' => 'meta_title', 'label' => 'Meta Title', 'type' => 'input'],
                ['key' => 'meta_keyword', 'label' => 'Meta Keyword', 'type' => 'input'],
                ['key' => 'meta_description', 'label' => 'Meta Description', 'type' => 'textarea', 'rows' => 3],
            ],
            'product_catalogue' => [
                ['key' => 'name', 'label' => 'Tên nhóm', 'type' => 'input', 'required' => true],
                ['key' => 'description', 'label' => 'Mô tả', 'type' => 'textarea', 'rows' => 4],
                ['key' => 'content', 'label' => 'Nội dung', 'type' => 'editor'],
                ['key' => 'canonical', 'label' => 'Đường dẫn tĩnh', 'type' => 'input'],
                ['key' => 'meta_title', 'label' => 'Meta Title', 'type' => 'input'],
                ['key' => 'meta_keyword', 'label' => 'Meta Keyword', 'type' => 'input'],
                ['key' => 'meta_description', 'label' => 'Meta Description', 'type' => 'textarea', 'rows' => 3],
            ],
            'product_brand' => [
                ['key' => 'name', 'label' => 'Tên thương hiệu', 'type' => 'input', 'required' => true],
                ['key' => 'description', 'label' => 'Mô tả', 'type' => 'editor'],
                ['key' => 'canonical', 'label' => 'Đường dẫn tĩnh', 'type' => 'input'],
                ['key' => 'meta_title', 'label' => 'Meta Title', 'type' => 'input'],
                ['key' => 'meta_keyword', 'label' => 'Meta Keyword', 'type' => 'input'],
                ['key' => 'meta_description', 'label' => 'Meta Description', 'type' => 'textarea', 'rows' => 3],
            ],
        ];

        return $configs[$module] ?? [];
    }
}

