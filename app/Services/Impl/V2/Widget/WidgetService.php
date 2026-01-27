<?php

namespace App\Services\Impl\V2\Widget;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\Widget\WidgetServiceInterface;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use App\Services\Interfaces\Promotion\PromotionServiceInterface;
use App\Services\Impl\V1\Promotion\PromotionPricingService;
use App\Repositories\Widget\WidgetRepo;
use App\Repositories\Product\ProductCatalogueRepo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

/**
 * WidgetService Version 2
 * 
 * Tuân thủ concept code của project:
 * - Sử dụng Repository pattern
 * - Gọi service khác thông qua interface
 * - Cache dữ liệu tối ưu
 * - Comment tiếng Việt mô tả phương thức
 */
class WidgetService extends BaseService implements WidgetServiceInterface
{
    protected ProductServiceInterface $productService;
    protected ProductCatalogueServiceInterface $productCatalogueService;
    protected PromotionServiceInterface $promotionService;
    protected ProductCatalogueRepo $productCatalogueRepo;
    
    protected $simpleFilter = ['publish'];
    protected $searchFields = ['name', 'keyword'];
    protected $sort = ['id', 'desc'];

    /** Cache keys */
    private const CACHE_PREFIX = 'widget:';
    private const CACHE_TTL = 300;

    /** Static cache trong request */
    private static array $requestCache = [];

    public function __construct(
        WidgetRepo $repository,
        ProductServiceInterface $productService,
        ProductCatalogueServiceInterface $productCatalogueService,
        PromotionServiceInterface $promotionService,
        ProductCatalogueRepo $productCatalogueRepo
    ) {
        $this->productService = $productService;
        $this->productCatalogueService = $productCatalogueService;
        $this->promotionService = $promotionService;
        $this->productCatalogueRepo = $productCatalogueRepo;
        parent::__construct($repository);
    }

    /**
     * Chuẩn bị dữ liệu model trước khi lưu
     */
    protected function prepareModelData(): static
    {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        
        $keyword = $this->modelData['keyword'] ?? Str::slug($this->modelData['name'] ?? '');
        $this->modelData['short_code'] = '[widget keyword="' . $keyword . '"]';
        
        return $this;
    }

    /**
     * Tìm widget theo ID
     */
    public function show(int $id)
    {
        return $this->repository->findById($id);
    }

    /**
     * Tạo mới widget
     */
    public function create($request)
    {
        return $this->save($request);
    }

    /**
     * Cập nhật widget theo ID
     */
    public function update($id, $request)
    {
        return $this->save($request, $id);
    }

    /**
     * Xóa widget theo ID
     */
    public function delete($id)
    {
        return $this->destroy($id);
    }

    /**
     * Tìm kiếm model theo từ khóa (dùng cho widget config)
     */
    public function searchModel($model, $keyword, $limit = 10)
    {
        $modelClass = $this->resolveModelClass($model);
        if (!$modelClass) {
            return [];
        }

        return $modelClass::query()
            ->where('publish', 2)
            ->when(!empty($keyword), function ($q) use ($keyword) {
                $q->where('name', 'LIKE', '%' . $keyword . '%');
            })
            ->take($limit)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name ?? $item->id,
                    'image' => $item->image ?? null,
                ];
            });
    }

    /**
     * Lấy dữ liệu widget theo keyword
     */
    public function getData($keyword)
    {
        $cacheKey = self::CACHE_PREFIX . 'data:' . $keyword;
        
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($keyword) {
            $widget = $this->repository->getModel()
                ->where('keyword', $keyword)
                ->where('publish', 2)
                ->first();
            
            if (!$widget) {
                return null;
            }
            
            return $this->processWidgetData($widget);
        });
    }

    /**
     * Lấy nhiều widget theo danh sách keywords
     * Tối ưu: load tất cả widgets 1 lần, xử lý chung các products
     */
    public function getMultipleData(array $keywords): array
    {
        if (empty($keywords)) {
            return [];
        }
        
        $widgets = $this->repository->getModel()
            ->whereIn('keyword', $keywords)
            ->where('publish', 2)
            ->get();
        
        if ($widgets->isEmpty()) {
            return [];
        }
        
        $result = [];
        $languageId = config('app.language_id', 1);
        
        $promotionProductIds = $this->getPromotionProductIds();
        $promotionProducts = null;
        
        foreach ($widgets as $widget) {
            $options = $widget->options ?? [];
            $autoPromotion = $options['_global']['auto_promotion'] ?? false;
            $limit = $options['_global']['items_limit'] ?? 10;
            
            if ($autoPromotion && str_contains($widget->model ?? '', 'Product')) {
                if ($promotionProducts === null && !empty($promotionProductIds)) {
                    $promotionProducts = $this->loadProductsWithMapping($promotionProductIds, $languageId);
                }
                
                $widget->items_data = $promotionProducts 
                    ? collect($promotionProducts)->take($limit)->values() 
                    : collect([]);
            } elseif (str_contains($widget->model ?? '', 'Product')) {
                $productIds = $widget->model_id ?? [];
                if (!empty($productIds)) {
                    $widget->items_data = collect($this->loadProductsWithMapping($productIds, $languageId))
                        ->take($limit)
                        ->values();
                } else {
                    $widget->items_data = collect([]);
                }
            } else {
                $widget->items_data = collect([]);
            }
            
            $result[$widget->keyword] = $widget;
        }
        
        return $result;
    }

    /**
     * Lấy dữ liệu widget danh mục cho section "Đề xuất cho bạn"
     * Trả về nhiều blocks, mỗi block là 1 danh mục cha với tabs danh mục con
     */
    public function getCategoryWidgetData($keyword)
    {
        $widget = $this->repository->getModel()
            ->where('keyword', $keyword)
            ->where('publish', 2)
            ->first();
        
        if (!$widget || $widget->model !== 'App\\Models\\ProductCatalogue') {
            return null;
        }
        
        $parentCategoryIds = $widget->model_id ?? [];
        if (empty($parentCategoryIds)) {
            return null;
        }
        
        $languageId = config('app.language_id', 1);
        $options = $widget->options ?? [];
        $itemsPerCategory = $options['_global']['items_per_category'] ?? 12;
        
        $parentCats = $this->productCatalogueRepo->getModel()
            ->whereIn('id', $parentCategoryIds)
            ->with('languages')
            ->get()
            ->keyBy('id');
        
        $childCats = $this->productCatalogueRepo->getModel()
            ->whereIn('parent_id', $parentCategoryIds)
            ->with('languages')
            ->get();
        
        $childrenByParent = $childCats->groupBy('parent_id');
        $allChildIds = $childCats->pluck('id')->toArray();
        
        $productCatalogueMapping = [];
        if (!empty($allChildIds)) {
            $productCatalogueMapping = DB::table('product_catalogue_product')
                ->whereIn('product_catalogue_id', $allChildIds)
                ->get()
                ->groupBy('product_catalogue_id');
        }
        
        $allProductIds = $productCatalogueMapping->flatten()->pluck('product_id')->unique()->toArray();
        
        $mappedProducts = collect([]);
        if (!empty($allProductIds)) {
            $mappedProducts = collect($this->loadProductsWithMapping($allProductIds, $languageId))
                ->keyBy('id');
        }
        
        $blocks = [];
        
        foreach ($parentCategoryIds as $parentId) {
            $parentCat = $parentCats[$parentId] ?? null;
            if (!$parentCat) continue;
            
            $parentLang = $parentCat->languages->firstWhere('id', $languageId);
            $parentName = $parentLang?->pivot?->name 
                ?? $parentCat->languages->first()?->pivot?->name 
                ?? 'N/A';
            
            $children = $childrenByParent[$parentId] ?? collect([]);
            $childCatsData = $this->mapCategoriesWithLanguage($children, $languageId);
            
            $productsByChild = [];
            $blockAllProducts = collect([]);
            
            foreach ($childCatsData as $child) {
                $childId = $child['id'];
                $childName = $child['name'];
                
                $childProductIds = ($productCatalogueMapping[$childId] ?? collect([]))
                    ->pluck('product_id')
                    ->unique()
                    ->toArray();
                
                $childProducts = collect($childProductIds)
                    ->map(fn($pid) => $mappedProducts[$pid] ?? null)
                    ->filter()
                    ->take($itemsPerCategory)
                    ->map(function ($product) use ($childName) {
                        $product['category_name'] = $childName;
                        return $product;
                    })
                    ->values();
                
                $productsByChild[$childId] = $childProducts->toArray();
                $blockAllProducts = $blockAllProducts->merge($childProducts);
            }
            
            $blockAllProducts = $blockAllProducts->unique('id')->take($itemsPerCategory)->values();
            
            $blocks[] = [
                'parent_id' => $parentId,
                'parent_name' => $parentName,
                'parent_image' => $parentCat->image,
                'children' => $childCatsData->toArray(),
                'products_by_child' => $productsByChild,
                'all_products' => $blockAllProducts->toArray(),
            ];
        }
        
        return [
            'main_title' => $widget->name ?? 'Đề xuất cho bạn',
            'blocks' => $blocks,
        ];
    }

    /**
     * Xử lý dữ liệu widget (helper method)
     */
    protected function processWidgetData($widget)
    {
        $options = $widget->options ?? [];
        $autoPromotion = $options['_global']['auto_promotion'] ?? false;
        $limit = $options['_global']['items_limit'] ?? 10;
        $languageId = config('app.language_id', 1);
        
        if ($autoPromotion && str_contains($widget->model ?? '', 'Product')) {
            $productIds = $this->getPromotionProductIds();
            if (!empty($productIds)) {
                $products = $this->loadProductsWithMapping($productIds, $languageId);
                $widget->items_data = collect($products)->take($limit)->values();
            } else {
                $widget->items_data = collect([]);
            }
        } elseif (str_contains($widget->model ?? '', 'Product')) {
            $productIds = $widget->model_id ?? [];
            if (!empty($productIds)) {
                $products = $this->loadProductsWithMapping($productIds, $languageId);
                $widget->items_data = collect($products)->take($limit)->values();
            } else {
                $widget->items_data = collect([]);
            }
        } else {
            $widget->items_data = collect([]);
        }
        
        return $widget;
    }

    /**
     * Lấy danh sách product IDs từ các promotion đang active
     */
    private function getPromotionProductIds(): array
    {
        $cacheKey = 'promotion_product_ids';
        
        if (isset(self::$requestCache[$cacheKey])) {
            return self::$requestCache[$cacheKey];
        }
        
        $activePromotionIds = DB::table('promotions')
            ->where('publish', 2)
            ->where(function ($q) {
                $q->where('no_end_date', 1)
                    ->orWhere(function ($q2) {
                        $q2->whereNotNull('end_date')
                            ->where('end_date', '>', now());
                    });
            })
            ->whereNull('deleted_at')
            ->pluck('id');
        
        if ($activePromotionIds->isEmpty()) {
            self::$requestCache[$cacheKey] = [];
            return [];
        }
        
        $productIdsFromVariants = DB::table('promotion_product_variant')
            ->whereIn('promotion_id', $activePromotionIds)
            ->pluck('product_id')
            ->toArray();
        
        $catalogueIds = DB::table('promotion_product_catalogue')
            ->whereIn('promotion_id', $activePromotionIds)
            ->pluck('product_catalogue_id');
        
        $productIdsFromCatalogues = [];
        if ($catalogueIds->isNotEmpty()) {
            $productIdsFromCatalogues = DB::table('product_catalogue_product')
                ->whereIn('product_catalogue_id', $catalogueIds)
                ->pluck('product_id')
                ->toArray();
        }
        
        $allProductIds = array_unique(array_merge($productIdsFromVariants, $productIdsFromCatalogues));
        self::$requestCache[$cacheKey] = $allProductIds;
        
        return $allProductIds;
    }

    /**
     * Load products và map sang format frontend
     * Cache từng product riêng lẻ để tái sử dụng giữa các calls
     */
    private function loadProductsWithMapping(array $productIds, int $languageId): array
    {
        if (empty($productIds)) {
            return [];
        }
        
        // Khởi tạo cache cho mapped products nếu chưa có
        if (!isset(self::$requestCache['mapped_products'])) {
            self::$requestCache['mapped_products'] = [];
        }
        
        // Tìm những product chưa được cache
        $uncachedIds = array_diff($productIds, array_keys(self::$requestCache['mapped_products']));
        
        // Nếu tất cả đã được cache, trả về từ cache
        if (empty($uncachedIds)) {
            return $this->getMappedProductsByIds($productIds);
        }
        
        // Load products chưa cache
        $products = DB::table('products')
            ->whereIn('id', $uncachedIds)
            ->where('publish', 2)
            ->whereNull('deleted_at')
            ->get();
        
        if ($products->isEmpty()) {
            // Đánh dấu những ID không tồn tại
            foreach ($uncachedIds as $id) {
                self::$requestCache['mapped_products'][$id] = null;
            }
            return $this->getMappedProductsByIds($productIds);
        }
        
        $actualProductIds = $products->pluck('id')->toArray();
        
        // Load product languages
        $productLanguages = DB::table('product_language')
            ->whereIn('product_id', $actualProductIds)
            ->where('language_id', $languageId)
            ->get()
            ->keyBy('product_id');
        
        // Load stocks
        $productStocks = DB::table('product_warehouse_stocks')
            ->whereIn('product_id', $actualProductIds)
            ->select('product_id', DB::raw('SUM(stock_quantity) as total_stock'))
            ->groupBy('product_id')
            ->get()
            ->keyBy('product_id');
        
        // Load category mapping
        $categoryMapping = DB::table('product_catalogue_product')
            ->whereIn('product_id', $actualProductIds)
            ->get()
            ->groupBy('product_id');
        
        $catalogueIds = $categoryMapping->flatten()->pluck('product_catalogue_id')->unique()->toArray();
        $catalogues = $this->getCataloguesWithLanguages($catalogueIds, $languageId);
        
        // Sử dụng cached pricing service
        if (!isset(self::$requestCache['pricing_service'])) {
            self::$requestCache['pricing_service'] = new PromotionPricingService();
        }
        $pricingService = self::$requestCache['pricing_service'];
        
        // Inject catalogue cache
        $catalogueData = [];
        foreach ($categoryMapping as $productId => $pivots) {
            $catalogueData[$productId] = $pivots->pluck('product_catalogue_id')->toArray();
        }
        PromotionPricingService::injectProductCatalogueCache($catalogueData);
        $pricingService->preloadForProducts($actualProductIds);
        
        // Map và cache từng product
        foreach ($products as $product) {
            $productLang = $productLanguages[$product->id] ?? null;
            $stock = $productStocks[$product->id]->total_stock ?? 0;
            
            $catId = ($categoryMapping[$product->id] ?? collect([]))->first()->product_catalogue_id ?? null;
            $categoryName = '';
            if ($catId && isset($catalogues[$catId])) {
                $categoryName = $catalogues[$catId];
            }
            
            $price = $product->retail_price ?? 0;
            $priceData = $pricingService->calculateProductPrice($product->id, $price);
            
            self::$requestCache['mapped_products'][$product->id] = [
                'id' => $product->id,
                'name' => $productLang->name ?? '',
                'canonical' => $productLang->canonical ?? null,
                'image' => $product->image,
                'price' => $price,
                'sale_price' => $priceData['final_price'] ?? $price,
                'discount_percentage' => $priceData['discount_percentage'] ?? 0,
                'discount_type' => $priceData['discount_type'] ?? null,
                'promotion_end_date' => $priceData['promotion_end_date'] ?? null,
                'stock' => (int) $stock,
                'category_name' => $categoryName,
                'rating' => 5,
                'reviews_count' => 0,
                'has_variants' => false,
                'variants' => [],
            ];
        }
        
        // Đánh dấu những ID không tồn tại
        $loadedIds = $products->pluck('id')->toArray();
        foreach (array_diff($uncachedIds, $loadedIds) as $id) {
            self::$requestCache['mapped_products'][$id] = null;
        }
        
        return $this->getMappedProductsByIds($productIds);
    }
    
    /**
     * Lấy mapped products theo danh sách IDs từ cache
     */
    private function getMappedProductsByIds(array $productIds): array
    {
        $result = [];
        foreach ($productIds as $id) {
            $mapped = self::$requestCache['mapped_products'][$id] ?? null;
            if ($mapped !== null) {
                $result[] = $mapped;
            }
        }
        return $result;
    }

    /**
     * Lấy danh mục với ngôn ngữ, có cache
     */
    private function getCataloguesWithLanguages(array $catalogueIds, int $languageId): array
    {
        if (empty($catalogueIds)) {
            return [];
        }
        
        $cacheKey = 'catalogues_with_lang';
        
        if (!isset(self::$requestCache[$cacheKey])) {
            self::$requestCache[$cacheKey] = [];
        }
        
        $uncachedIds = array_diff($catalogueIds, array_keys(self::$requestCache[$cacheKey]));
        
        if (!empty($uncachedIds)) {
            $catalogues = $this->productCatalogueRepo->getModel()
                ->whereIn('id', $uncachedIds)
                ->with('languages')
                ->get();
            
            foreach ($catalogues as $cat) {
                $catLang = $cat->languages->firstWhere('id', $languageId);
                self::$requestCache[$cacheKey][$cat->id] = $catLang?->pivot?->name 
                    ?? $cat->languages->first()?->pivot?->name 
                    ?? '';
            }
        }
        
        return array_intersect_key(self::$requestCache[$cacheKey], array_flip($catalogueIds));
    }

    /**
     * Map collection danh mục sang format với ngôn ngữ
     */
    private function mapCategoriesWithLanguage($categories, int $languageId)
    {
        return $categories->map(function ($cat) use ($languageId) {
            $catLang = $cat->languages->firstWhere('id', $languageId);
            return [
                'id' => $cat->id,
                'name' => $catLang?->pivot?->name ?? $cat->languages->first()?->pivot?->name ?? 'N/A',
                'image' => $cat->image,
            ];
        });
    }

    /**
     * Resolve class name từ model string
     */
    private function resolveModelClass(string $model): ?string
    {
        $modelMap = [
            'App\\Models\\Product' => \App\Models\Product::class,
            'App\\Models\\ProductCatalogue' => \App\Models\ProductCatalogue::class,
            'App\\Models\\Post' => \App\Models\Post::class,
            'App\\Models\\PostCatalogue' => \App\Models\PostCatalogue::class,
        ];
        
        return $modelMap[$model] ?? null;
    }
}
