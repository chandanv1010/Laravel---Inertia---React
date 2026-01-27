<?php  
namespace App\Services\Impl\V1\Product;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Repositories\Product\ProductCatalogueRepo;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\Interfaces\NestedSetInterface;
use App\Traits\HasNestedset;
use App\Traits\HasRouter;
use App\Services\Impl\V1\Cache\BaseCacheService;
use Illuminate\Http\Request;
use App\Helpers\DropdownHelper;
use App\Helpers\RecursiveHelper;
use App\Models\Product;
use App\Models\ProductCatalogue;
use App\Models\Attribute;
use App\Services\Impl\V1\Promotion\PromotionPricingService;


class ProductCatalogueService extends BaseCacheService implements ProductCatalogueServiceInterface {

    use HasNestedset, HasRouter;

    // Cache strategy: 'default' phù hợp cho product_catalogues vì ít thay đổi và cần cache lâu dài
    protected string $cacheStrategy = 'default';
    protected string $module = 'product_catalogues';

    protected $repository;

    protected $with = ['creators', 'current_languages', 'languages'];
    protected $simpleFilter = ['publish', 'user_id'];
    protected $complexFilter = ['lft', 'rgt']; // Để filter nested set
    protected $searchFields = ['name', 'description'];
    protected $isMultipleLanguage = true; // Search trong pivot table product_catalogue_language
    protected $pivotTable = 'product_catalogue_language'; // Tên bảng pivot cho search
    protected $pivotForeignKey = 'product_catalogue_id'; // Foreign key trong pivot table
    protected $sort = ['lft', 'asc'];

    // protected $pivotFields = [
    //     'extends' => [''],
    //     'except' => ['']
    // ];
    
    // protected $languageFields = [
    //     'extends' => ['abc'],
    //     'except' => ['meta_title']
    // ];
    

    // protected $perpage = ;

    public function __construct(
        ProductCatalogueRepo $repository
    )
    {
        $this->repository = $repository;
        $this->initNestedset(['table' => $this->module, 'foreigKey' => 'product_catalogue_id', 'pivotTable' => 'product_catalogue_language']);
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        return $this;
    }

    protected function beforeSave(): static
    {
        $this->handlePivotLanguageFields();
        return $this;
    }

    protected function beforeDelete($id): static
    {
        // Load model trước
        parent::beforeDelete($id);
        
        // Kiểm tra xem có danh mục con không bằng nested set (rgt - lft > 1)
        // Trong nested set, nếu rgt - lft > 1 thì có danh mục con
        if($this->model && isset($this->model->lft) && isset($this->model->rgt)){
            $hasChildren = ($this->model->rgt - $this->model->lft) > 1;
            
            if($hasChildren){
                throw new \Exception('Không thể xóa danh mục này vì còn danh mục con. Vui lòng xóa tất cả danh mục con trước.');
            }
        }
        
        return $this;
    }

    protected function afterSave(): static
    {
        $this->syncRouter($this->module, 'ProductCataloguePage', 'App\Http\Controllers\Frontend\Product\ProductCatalogueController');
        $this->runNestedSet();
        return parent::afterSave();
    }

    protected function afterDelete(): static
    {
        $catalogueId = $this->model->id;
        
        // 1. Xóa hard delete router của danh mục
        $this->deleteRouter();
        
        // 2. Xử lý các items liên quan (products, etc.)
        $this->handleRelatedItemsOnCatalogueDelete($catalogueId);
        
        // 3. Cập nhật nested set
        $this->runNestedSet();
        
        // 4. Clear cache (invalidateCache đã tự động gọi invalidatePaginateCache)
        $this->invalidateCache();
        
        return parent::afterDelete();
    }


    protected function afterBulkDestroy(): static
    {
        $this->runNestedSet();
        return $this;
    }

    /**
     * Override withRelation để xử lý đặc biệt cho languages relation
     * Sử dụng syncWithoutDetaching để không xóa các bản dịch đã có
     */
    protected function withRelation(): static {
        $relationable = $this->repository->getRelationable() ?? [];
        
        if(count($relationable)){
            foreach($relationable as $relation){
                if($this->request->has($relation)){
                    // Xử lý đặc biệt cho languages relation
                    if($relation === 'languages'){
                        // Sử dụng syncWithoutDetaching để không xóa các languages đã có
                        // Chỉ update hoặc attach language mới (ngôn ngữ hiện tại)
                        $this->model->{$relation}()->syncWithoutDetaching($this->request->{$relation});
                    } else {
                        // Các relation khác vẫn dùng sync() bình thường
                        $this->model->{$relation}()->sync($this->request->{$relation});
                    }
                }
            }
        }
        
        return $this;
    }

    public function getDropdown()
    {
        // Sử dụng paginate với type='all' để tận dụng cache strategy
        $request = new Request([
            'type' => 'all',
            'publish' => '2',
            'sort' => 'lft,asc' // Sử dụng sort mặc định của service (nested set order)
        ]);
        
        $records = $this->paginate($request);

        // Sử dụng DropdownHelper để transform, ProductCatalogue là multiple language
        return DropdownHelper::transform($records, [
            'valueKey' => 'id',
            'isMultipleLanguage' => true, // ProductCatalogue là multiple language
        ]);
    }

    /**
     * Get dropdown with hierarchy for promotion selection
     * Returns array with id, name, level, and image for hierarchical display
     * 
     * @return array
     */
    public function getDropdownWithHierarchy(): array
    {
        $languageId = config('app.language_id', 1);
        
        $records = $this->repository->getModel()
            ->where('publish', 2)
            ->withCount('products')
            ->with(['languages' => function ($q) use ($languageId) {
                $q->where('language_id', $languageId);
            }])
            ->orderBy('lft', 'asc')
            ->get();

        return $records->map(function ($item) {
            $name = '';
            $canonical = null;
            
            $lang = $item->languages->first();
            if ($lang && $lang->pivot) {
                $name = $lang->pivot->name ?: '';
                $canonical = $lang->pivot->canonical ?: null;
            }
            
            $level = 1;
            if (isset($item->depth)) {
                $level = (int) $item->depth;
            }
            
            return [
                'id' => $item->id,
                'name' => $name,
                'level' => $level,
                'image' => $item->image,
                'canonical' => $canonical,
                'product_count' => $item->products_count ?? 0,
            ];
        })->toArray();
    }

    /**
     * Lấy categories cho homepage slider widget
     */
    public function getCategoriesForSlider(): array
    {
        $languageId = config('app.language_id', 1);
        
        $records = $this->repository->getModel()
            ->where('publish', 2)
            ->withCount(['products' => function ($q) {
                $q->where('publish', 2);
            }])
            ->with(['languages' => function ($q) use ($languageId) {
                $q->where('language_id', $languageId);
            }])
            ->orderBy('order', 'asc')
            ->limit(20)
            ->get();

        return $records->map(function ($item) {
            $lang = $item->languages->first();
            return [
                'id' => $item->id,
                'name' => $lang?->pivot?->name ?: '',
                'image' => $item->image,
                'canonical' => $lang?->pivot?->canonical,
                'product_count' => $item->products_count ?? 0,
            ];
        })->toArray();
    }



    /**
     * Lấy danh sách sản phẩm theo danh mục với pagination và filters
     */
    public function getProductsByCatalogue(int $catalogueId, array $filters = [], int $perPage = 15): array
    {
        $languageId = config('app.language_id', 1);
        $catalogueIds = RecursiveHelper::getAllChildIds(ProductCatalogue::class, $catalogueId);
        
        $query = Product::whereHas('product_catalogues', function ($q) use ($catalogueIds) {
            $q->whereIn('product_catalogue_id', $catalogueIds);
        })->where('publish', 2);
        
        if (!empty($filters['min_price'])) {
            $query->where('retail_price', '>=', $filters['min_price']);
        }
        if (!empty($filters['max_price'])) {
            $query->where('retail_price', '<=', $filters['max_price']);
        }
        
        if (!empty($filters['attributes'])) {
            foreach ($filters['attributes'] as $attrCatalogueId => $attrIds) {
                if (!empty($attrIds)) {
                    $query->whereHas('variants.attributes', fn($q) => $q->whereIn('attributes.id', (array)$attrIds));
                }
            }
        }
        
        $sort = $filters['sort'] ?? 'newest';
        match($sort) {
            'price_asc' => $query->orderBy('retail_price', 'asc'),
            'price_desc' => $query->orderBy('retail_price', 'desc'),
            'oldest' => $query->orderBy('created_at', 'asc'),
            default => $query->orderBy('created_at', 'desc'),
        };
        
        $paginator = $query->paginate($perPage);
        $products = $this->mapProductsForFrontend($paginator->items(), $languageId, $catalogueIds);
        
        return [
            'data' => $products,
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }

    /**
     * Map products cho frontend display
     */
    public function mapProductsForFrontend(array $products, int $languageId, array $catalogueIds): array
    {
        $productIds = array_map(fn($p) => $p->id, $products);
        if (empty($productIds)) return [];
        
        $productLanguages = DB::table('product_language')
            ->whereIn('product_id', $productIds)->where('language_id', $languageId)
            ->get()->keyBy('product_id');
        
        $stocks = DB::table('product_warehouse_stocks')
            ->whereIn('product_id', $productIds)
            ->selectRaw('product_id, SUM(stock_quantity) as total_stock')
            ->groupBy('product_id')->get()->keyBy('product_id');
        
        $categoryPivots = DB::table('product_catalogue_product')
            ->whereIn('product_id', $productIds)->get()->groupBy('product_id');
        
        $catIds = $categoryPivots->flatten()->pluck('product_catalogue_id')->unique()->toArray();
        $catalogues = ProductCatalogue::getCachedWithLanguages($catIds)->keyBy('id');
        
        $pricingService = new PromotionPricingService();
        
        // Inject cache to avoid duplicate query in preloadForProducts
        if ($categoryPivots->isNotEmpty()) {
            $catalogueData = [];
            foreach ($categoryPivots as $productId => $pivots) {
                $catalogueData[$productId] = $pivots->pluck('product_catalogue_id')->toArray();
            }
            PromotionPricingService::injectProductCatalogueCache($catalogueData);
        }
        
        $pricingService->preloadForProducts($productIds);
        
        return array_map(function ($product) use ($productLanguages, $stocks, $categoryPivots, $catalogues, $languageId, $pricingService) {
            $lang = $productLanguages[$product->id] ?? null;
            $stock = $stocks[$product->id] ?? null;
            
            $categoryName = '';
            $categoryCanonical = '';
            $pivots = $categoryPivots[$product->id] ?? collect([]);
            if ($pivots->isNotEmpty()) {
                $catId = $pivots->first()->product_catalogue_id;
                if (isset($catalogues[$catId])) {
                    $cat = $catalogues[$catId];
                    $catLang = $cat->languages->firstWhere('id', $languageId);
                    $categoryName = $catLang?->pivot?->name ?? '';
                    $categoryCanonical = $catLang?->pivot?->canonical ?? '';
                }
            }
            
            $pricing = $pricingService->calculateProductPrice($product->id, $product->retail_price);
            $hasDiscount = $pricing['final_price'] < $product->retail_price;
            
             // Calculate Rating
            // Reviews are eager loaded from ProductService::paginate
            $publishedReviews = $product->reviews->where('publish', 2);
            $reviewCount = $publishedReviews->count();
            $averageRating = $reviewCount > 0 ? round($publishedReviews->avg('score'), 1) : 5.0;
            
            return [
                'id' => $product->id,
                'name' => $lang?->name ?? $product->name ?? '',
                'canonical' => $lang?->canonical ?? '',
                'image' => $product->image,
                'price' => (float)$product->retail_price,
                'original_price' => (float)$product->retail_price,
                'sale_price' => $hasDiscount ? (float)$pricing['final_price'] : null,
                'discount' => 0, // Placeholder
                'rating' => $averageRating,
                'review_count' => $reviewCount,
                'sold_count' => 0, // Placeholder
                'category_name' => $categoryName,
                'category_canonical' => $categoryCanonical,
                'has_discount' => $hasDiscount,
                'discount_percent' => $pricing['discount_percent'],
                'flash_sale' => null, // Placeholder
            ];
        }, $products);

    }

    /**
     * Lấy các filter options cho danh mục
     */
    public function getFiltersForCatalogue(int $catalogueId): array
    {
        $languageId = config('app.language_id', 1);
        $catalogueIds = RecursiveHelper::getAllChildIds(ProductCatalogue::class, $catalogueId);
        
        $priceStats = Product::whereHas('product_catalogues', fn($q) => $q->whereIn('product_catalogue_id', $catalogueIds))
            ->where('publish', 2)
            ->selectRaw('MIN(retail_price) as min_price, MAX(retail_price) as max_price')
            ->first();
        
        $productIds = Product::whereHas('product_catalogues', fn($q) => $q->whereIn('product_catalogue_id', $catalogueIds))
            ->where('publish', 2)->pluck('id')->toArray();
        
        $attributeGroups = [];
        if (!empty($productIds)) {
            $attrIds = DB::table('product_variant_attributes')
                ->join('product_variants', 'product_variants.id', '=', 'product_variant_attributes.product_variant_id')
                ->whereIn('product_variants.product_id', $productIds)
                ->pluck('product_variant_attributes.attribute_id')->unique()->toArray();
            
            if (!empty($attrIds)) {
                $attrs = Attribute::whereIn('id', $attrIds)->where('publish', 2)
                    ->with(['languages', 'attribute_catalogue.languages'])->get();
                
                $grouped = $attrs->groupBy('attribute_catalogue_id');
                foreach ($grouped as $catId => $items) {
                    $cat = $items->first()->attribute_catalogue;
                    if (!$cat) continue;
                    $catLang = $cat->languages->firstWhere('id', $languageId);
                    
                    $attributeGroups[] = [
                        'id' => $catId,
                        'name' => $catLang?->pivot?->name ?? 'Thuộc tính',
                        'attributes' => $items->map(fn($a) => [
                            'id' => $a->id,
                            'name' => $a->languages->firstWhere('id', $languageId)?->pivot?->name ?? $a->value ?? '',
                            'value' => $a->value,
                            'color_code' => $a->color_code,
                        ])->toArray(),
                    ];
                }
            }
        }
        
        return [
            'price_range' => [
                'min' => (float)($priceStats->min_price ?? 0),
                'max' => (float)($priceStats->max_price ?? 10000000),
            ],
            'sort_options' => [
                ['value' => 'newest', 'label' => 'Mới nhất'],
                ['value' => 'oldest', 'label' => 'Cũ nhất'],
                ['value' => 'price_asc', 'label' => 'Giá: Thấp đến Cao'],
                ['value' => 'price_desc', 'label' => 'Giá: Cao đến Thấp'],
            ],
            'attribute_groups' => $attributeGroups,
        ];
    }

    /**
     * Lấy tất cả danh mục dạng flat với depth cho filter sidebar
     */
    public function getAllCategoriesFlat(): array
    {
        $languageId = config('app.language_id', 1);
        
        return RecursiveHelper::getFlatTreeWithDepth(
            ProductCatalogue::class,
            function ($cat, $depth) use ($languageId) {
                $lang = $cat->languages->firstWhere('id', $languageId);
                $allIds = RecursiveHelper::getAllChildIds(ProductCatalogue::class, $cat->id);
                $productCount = Product::whereHas('product_catalogues', fn($q) => $q->whereIn('product_catalogue_id', $allIds))
                    ->where('publish', 2)->count();
                
                return [
                    'id' => $cat->id,
                    'parent_id' => $cat->parent_id,
                    'name' => $lang?->pivot?->name ?? '',
                    'canonical' => $lang?->pivot?->canonical ?? '',
                    'image' => $cat->image,
                    'product_count' => $productCount,
                    'depth' => $depth,
                ];
            }
        );
    }
}
