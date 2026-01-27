<?php 
namespace App\Services\Impl\V1\Translate;

use App\Services\Interfaces\Translate\TranslateServiceInterface;
use App\Services\Interfaces\Post\PostServiceInterface;
use App\Services\Interfaces\Post\PostCatalogueServiceInterface;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use App\Services\Interfaces\Product\ProductBrandServiceInterface;
use App\Services\Interfaces\Setting\LanguageServiceInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use ReflectionClass;
use App\Traits\HasTransaction;
use App\Traits\HasTracking;

class TranslateService implements TranslateServiceInterface {

    use HasTransaction, HasTracking;

    private $languageService;
    private $postService;
    private $postCatalogueService;
    private $productService;
    private $productCatalogueService;
    private $productBrandService;

    // Map module name to pivot table name
    private $modulePivotMap = [
        'post' => 'post_language',
        'post_catalogue' => 'post_catalogue_language',
        'product' => 'product_language',
        'product_catalogue' => 'product_catalogue_language',
        'product_brand' => 'product_brand_language',
    ];

    // Map module name to foreign key in pivot table
    private $moduleForeignKeyMap = [
        'post' => 'post_id',
        'post_catalogue' => 'post_catalogue_id',
        'product' => 'product_id',
        'product_catalogue' => 'product_catalogue_id',
        'product_brand' => 'product_brand_id',
    ];

    // Map module name to relation name in model
    private $moduleRelationMap = [
        'post' => 'languages',
        'post_catalogue' => 'languages',
        'product' => 'languages',
        'product_catalogue' => 'languages',
        'product_brand' => 'languages',
    ];

    // Translation fields available in pivot tables
    private $translationFields = [
        'name',
        'description',
        'content',
        'canonical',
        'meta_title',
        'meta_keyword',
        'meta_description',
    ];

    public function __construct(
        LanguageServiceInterface $languageService,
        PostServiceInterface $postService,
        PostCatalogueServiceInterface $postCatalogueService,
        ProductServiceInterface $productService,
        ProductCatalogueServiceInterface $productCatalogueService,
        ProductBrandServiceInterface $productBrandService
    ) {
        $this->languageService = $languageService;
        $this->postService = $postService;
        $this->postCatalogueService = $postCatalogueService;
        $this->productService = $productService;
        $this->productCatalogueService = $productCatalogueService;
        $this->productBrandService = $productBrandService;
    }

    /**
     * Resolve service từ module name
     */
    private function resolveService(string $module): ?object
    {
        $serviceMap = [
            'post' => $this->postService,
            'post_catalogue' => $this->postCatalogueService,
            'product' => $this->productService,
            'product_catalogue' => $this->productCatalogueService,
            'product_brand' => $this->productBrandService,
        ];

        return $serviceMap[$module] ?? null;
    }

    /**
     * Lấy translation data cho một language cụ thể
     * Gọi vào service thay vì Model trực tiếp để tận dụng cache
     */
    public function getTranslationData(string $module, int $recordId, int $languageId): ?array
    {
        // Gọi vào service để lấy record (tận dụng cache)
        $service = $this->resolveService($module);
        if (!$service) {
            return null;
        }

        $record = $service->show($recordId);
        if (!$record) {
            return null;
        }

        // Tận dụng cache từ service->show(), nhưng cần query lại relation với language_id cụ thể
        // Unset relation để đảm bảo query lại từ database với điều kiện language_id mới
        if ($record->relationLoaded('languages')) {
            unset($record->languages);
        }
        
        // Query relation với language_id cụ thể để lấy đúng translation data
        $translation = $record->languages()
            ->where('languages.id', $languageId)
            ->first();
        
        // Trả về array rỗng nếu chưa có translation (thay vì null)
        // để frontend vẫn có thể hiển thị form với dữ liệu mặc định
        if (!$translation) {
            return [];
        }

        return [
            'name' => $translation->pivot->name ?? null,
            'description' => $translation->pivot->description ?? null,
            'content' => $translation->pivot->content ?? null,
            'canonical' => $translation->pivot->canonical ?? null,
            'meta_title' => $translation->pivot->meta_title ?? null,
            'meta_keyword' => $translation->pivot->meta_keyword ?? null,
            'meta_description' => $translation->pivot->meta_description ?? null,
            'auto_translate' => $record->auto_translate ?? false,
        ];
    }

    /**
     * Lấy default translation data (ngôn ngữ hiện tại) để làm reference
     * Gọi vào service thay vì Model trực tiếp để tận dụng cache
     */
    public function getDefaultTranslationData(string $module, int $recordId): ?array
    {
        // Gọi vào service để lấy record (tận dụng cache)
        $service = $this->resolveService($module);
        if (!$service) {
            return null;
        }

        $record = $service->show($recordId);
        if (!$record) {
            return null;
        }

        $defaultLanguageId = config('app.language_id');
        if (!$defaultLanguageId) {
            return null;
        }

        // Tận dụng cache từ service->show(), nhưng cần query lại relation với defaultLanguageId
        // Unset relation để đảm bảo query lại từ database với điều kiện language_id mới
        if ($record->relationLoaded('languages')) {
            unset($record->languages);
        }
        
        // Query relation với defaultLanguageId để lấy đúng default translation data
        $defaultLang = $record->languages()
            ->where('languages.id', $defaultLanguageId)
            ->first();

        if (!$defaultLang) {
            return null;
        }

        return [
            'name' => $defaultLang->pivot->name ?? null,
            'description' => $defaultLang->pivot->description ?? null,
            'content' => $defaultLang->pivot->content ?? null,
            'canonical' => $defaultLang->pivot->canonical ?? null,
            'meta_title' => $defaultLang->pivot->meta_title ?? null,
            'meta_keyword' => $defaultLang->pivot->meta_keyword ?? null,
            'meta_description' => $defaultLang->pivot->meta_description ?? null,
        ];
    }

    /**
     * Lưu translation cho một language
     * Gọi vào service để lấy record, sau đó sync pivot data
     * Sử dụng transaction để đảm bảo atomicity: nếu lưu _language thành công nhưng lưu routers thất bại thì rollback
     */
    public function saveTranslation(string $module, int $recordId, int $languageId, array $translationData): bool
    {
        try {
            return $this->beginTransaction()
                ->processTranslation($module, $recordId, $languageId, $translationData)
                ->commit()
                ->getTranslationResult();
        } catch (\Throwable $th) {
            $this->rollback();
            // Re-throw exception để controller có thể xử lý và hiển thị message
            throw $th;
        }
    }

    private $translationResult = false;

    /**
     * Xử lý logic lưu translation (được gọi trong transaction)
     */
    private function processTranslation(string $module, int $recordId, int $languageId, array $translationData): static
    {
        // Gọi vào service để lấy record (tận dụng cache)
        $service = $this->resolveService($module);
        if (!$service) {
            throw new \Exception("Không tìm thấy service cho module: {$module}");
        }

        $record = $service->show($recordId);
        if (!$record) {
            throw new \Exception("Không tìm thấy record với ID: {$recordId}");
        }

        // Kiểm tra language có tồn tại và đã publish - gọi vào LanguageService
        $language = $this->languageService->show($languageId);
        
        if (!$language || $language->publish !== '2' || $language->deleted_at) {
            throw new \Exception("Language không hợp lệ hoặc chưa được publish");
        }

        // Tách auto_translate ra khỏi translation data - nó sẽ được lưu vào main table
        $autoTranslate = isset($translationData['auto_translate']) ? (bool)$translationData['auto_translate'] : null;
        
        // Kiểm tra xem đã có translation chưa
        $existingTranslation = $record->languages()
            ->where('languages.id', $languageId)
            ->first();
        
        $isNewTranslation = !$existingTranslation;
        
        // Prepare pivot data - chỉ lấy các fields có trong translationFields
        $pivotData = [];
        foreach ($this->translationFields as $field) {
            if (isset($translationData[$field]) && $translationData[$field] !== '') {
                $pivotData[$field] = $translationData[$field];
            }
        }

        // If request is ONLY toggling auto_translate, allow it even when translation doesn't exist yet.
        // (We still enforce name/canonical when user actually creates a translation.)
        $isOnlyAutoTranslate = $autoTranslate !== null && empty($pivotData);

        // Validate: name và canonical là bắt buộc khi tạo translation mới (trừ trường hợp chỉ toggle auto_translate)
        if ($isNewTranslation && !$isOnlyAutoTranslate) {
            if (empty($pivotData['name'])) {
                throw new \Exception("Tên (name) là bắt buộc khi tạo translation mới");
            }
            
            // Tự động tạo canonical từ name nếu không được cung cấp
            if (empty($pivotData['canonical']) && !empty($pivotData['name'])) {
                $pivotData['canonical'] = Str::slug($pivotData['name']);
            }
            
            // Validate: canonical là bắt buộc khi tạo mới
            if (empty($pivotData['canonical'])) {
                throw new \Exception("Canonical là bắt buộc khi tạo translation mới");
            }
        }

        // Format canonical sử dụng Str::slug nếu có
        if (!empty($pivotData['canonical'])) {
            $pivotData['canonical'] = Str::slug($pivotData['canonical']);
        }

        // Filter out empty values (null, empty string, false for non-boolean fields)
        $filteredData = array_filter($pivotData, function($value) {
            return $value !== null && $value !== '';
        });

        // Bước 1: Lưu translation vào pivot table (_language) nếu có dữ liệu
        if (!empty($filteredData)) {
            // Sync translation - sử dụng syncWithoutDetaching để update nếu đã tồn tại
            $record->languages()->syncWithoutDetaching([
                $languageId => $filteredData
            ]);
        }

        // Bước 2: Lưu auto_translate vào main table nếu có giá trị (quan trọng - phải lưu ngay cả khi không có pivot data)
        if ($autoTranslate !== null) {
            $record->auto_translate = $autoTranslate;
            $record->save();
        }
        
        // Nếu chỉ update auto_translate và không có pivot data, vẫn trả về success
        if (empty($filteredData) && $autoTranslate === null) {
            $this->translationResult = true;
            return $this; // Trả về true vì không có lỗi, chỉ là không có gì để lưu
        }

        // Bước 2: Lưu canonical vào routers table (chỉ khi có canonical)
        // Nếu bước này thất bại, toàn bộ transaction sẽ rollback
        if (!empty($filteredData['canonical'])) {
            // Lấy router config từ service hoặc từ module config map
            $config = $this->getRouterConfig($module, $service);
            
            if ($config) {
                // Sync router trực tiếp qua Router model với language_id
                $modelClass = get_class($record);
                
                // Điều kiện để tìm router (dùng cho WHERE clause)
                $whereConditions = [
                    'module' => $config['module'],
                    'routerable_id' => $record->id,
                    'routerable_type' => $modelClass,
                    'language_id' => $languageId
                ];
                
                // Dữ liệu để insert/update (dùng cho VALUES clause)
                $payload = [
                    'routerable_id' => $record->id,
                    'routerable_type' => $modelClass,
                    'module' => $config['module'],
                    'next_component' => $config['next_component'],
                    'controller' => $config['controller'],
                    'canonical' => $filteredData['canonical'],
                    'language_id' => $languageId, // Lưu language_id để phân biệt canonical của từng ngôn ngữ
                ];
                
                // UpdateOrCreate router với điều kiện: module + routerable_id + routerable_type + language_id
                // Điều này đảm bảo mỗi ngôn ngữ có một record router riêng
                // Lưu ý: Phải dùng Router::updateOrCreate() trực tiếp vì relation morphOne chỉ hỗ trợ 1 record
                // Nếu có lỗi ở đây (ví dụ: duplicate key), exception sẽ được throw và transaction sẽ rollback
                \App\Models\Router::updateOrCreate($whereConditions, $payload);
            }
        }

        // Track translation action
        $this->trackAction('translate', $module, $record, [
            'description' => "Dịch {$module} sang ngôn ngữ {$language->name}",
            'language_id' => $languageId,
            'language_name' => $language->name,
        ]);

        $this->translationResult = true;
        return $this;
    }

    private function getTranslationResult(): bool
    {
        return $this->translationResult;
    }

    /**
     * Lấy router config cho module
     * Ưu tiên lấy từ service (nếu có), sau đó mới lấy từ module config map
     * 
     * @param string $module Module name (ví dụ: 'product', 'product_catalogue')
     * @param object|null $service Service instance (nếu có)
     * @return array|null Router config hoặc null nếu không tìm thấy
     */
    private function getRouterConfig(string $module, ?object $service = null): ?array
    {
        // Module config map - thêm module mới vào đây khi clone
        // Format: 'module_name' => ['module' => 'table_name', 'next_component' => 'ComponentName', 'controller' => 'Full\\Controller\\Path']
        $moduleConfigMap = [
            'post' => [
                'module' => 'posts',
                'next_component' => 'PostPage',
                'controller' => 'App\Http\Controllers\Frontend\Post\PostController'
            ],
            'post_catalogue' => [
                'module' => 'post_catalogues',
                'next_component' => 'PostCataloguePage',
                'controller' => 'App\Http\Controllers\Frontend\Post\PostCatalogueController'
            ],
            'product' => [
                'module' => 'products',
                'next_component' => 'ProductPage',
                'controller' => 'App\Http\Controllers\Frontend\Product\ProductController'
            ],
            'product_catalogue' => [
                'module' => 'product_catalogues',
                'next_component' => 'ProductCataloguePage',
                'controller' => 'App\Http\Controllers\Frontend\Product\ProductCatalogueController'
            ],
            'product_brand' => [
                'module' => 'product_brands',
                'next_component' => 'ProductBrandPage',
                'controller' => 'App\Http\Controllers\Frontend\Product\ProductBrandController'
            ]
        ];
        
        // Thử lấy từ service nếu có (sử dụng reflection để lấy properties)
        if ($service) {
            try {
                $reflection = new ReflectionClass($service);
                $moduleProperty = $reflection->getProperty('module');
                $moduleProperty->setAccessible(true);
                $serviceModule = $moduleProperty->getValue($service);
                
                // Kiểm tra xem service có method hoặc property để lấy router config không
                // Nếu có, có thể tự động detect từ service
                // Hiện tại, vẫn dùng moduleConfigMap vì đơn giản hơn
            } catch (\Exception $e) {
                // Ignore reflection errors
            }
        }
        
        // Lấy từ module config map
        return $moduleConfigMap[$module] ?? null;
    }
}

