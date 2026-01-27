<?php

namespace App\Services\Impl\V1\Widget;

use App\Services\Interfaces\Widget\WidgetServiceInterface;
use App\Models\Widget;
use App\Models\Promotion;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WidgetService implements WidgetServiceInterface
{
    // Static cache for promotion data (shared across all processWidgetData calls)
    private static $cachedActivePromotionIds = null;
    private static $cachedPromotionProductIds = null;
    private static $cachedPromotionCatalogueIds = null;
    private static $cachedProductIdsFromCatalogues = null;
    
    // Static cache for loaded and mapped products (avoid loading same products multiple times)
    private static $cachedAutoPromotionProducts = null;
    private static $cachedMappedProducts = null;
    public function paginate($request)
    {
        $keyword = $request->input('keyword');
        $perPage = $request->input('perpage', 20);
        $publish = $request->input('publish');
        
        $query = Widget::query();

        if (!empty($keyword)) {
            $query->where(function($q) use ($keyword) {
                $q->where('name', 'LIKE', '%' . $keyword . '%')
                  ->orWhere('keyword', 'LIKE', '%' . $keyword . '%');
            });
        }
        
        if ($publish && $publish != 0) {
             $query->where('publish', $publish);
        }

        return $query->orderBy('id', 'desc')->paginate($perPage)->withQueryString();
    }

    public function create($request)
    {
        DB::beginTransaction();
        try {
            $payload = $request->only(['name', 'keyword', 'description', 'album', 'model_id', 'model', 'options', 'content', 'publish']);
            
            // Auto-generate shortcode
            $keyword = $payload['keyword'] ?? Str::slug($payload['name'] ?? '');
            $payload['short_code'] = '[widget keyword="' . $keyword . '"]';
            
            $widget = Widget::create($payload);
            DB::commit();
            return $widget;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e->getMessage());
            throw $e;
        }
    }

    public function update($id, $request)
    {
        DB::beginTransaction();
        try {
            $widget = Widget::findOrFail($id);
            $payload = $request->only(['name', 'keyword', 'description', 'album', 'model_id', 'model', 'options', 'content', 'publish']);
            
            // Auto-update shortcode
            $keyword = $payload['keyword'] ?? $widget->keyword;
            $payload['short_code'] = '[widget keyword="' . $keyword . '"]';
            
            $widget->update($payload);
            DB::commit();
            return $widget;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e->getMessage());
            throw $e;
        }
    }

    public function delete($id)
    {
        DB::beginTransaction();
        try {
            $widget = Widget::findOrFail($id);
            $widget->delete();
            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e->getMessage());
            throw $e;
        }
    }

    public function show(int $id)
    {
        return Widget::findOrFail($id);
    }



    /**
     * Tìm kiếm items trong model cụ thể
     */
    public function searchModel($model, $keyword, $limit = 20)
    {
        $modelClass = $model; 
        
        if (!class_exists($modelClass)) {
            return collect([]);
        }

        $query = $modelClass::query();
        $languageId = config('app.language_id') ?? 1; // Default language ID

        // Detect if model is multilingual (has translation table)
        // Common pattern: App\Models\Product -> product_language table
        $classBasename = class_basename($modelClass);
        $tableName = Str::snake(Str::plural($classBasename)); // events -> events
        
        // Handle specific table names if non-standard, but usually standard
        // For standard models like Product/Post/Catalogue:
        $isMultilingual = in_array($classBasename, ['Product', 'Post', 'ProductCatalogue', 'PostCatalogue', 'AttributeCatalogue', 'Attribute']);

        if ($isMultilingual) {
            $pivotTable = Str::snake($classBasename) . '_language';
            $foreignKey = Str::snake($classBasename) . '_id';
            
            // Allow searching 1000 items if it's a Catalogue and no keyword (to list all)
            if (str_contains($classBasename, 'Catalogue') && empty($keyword)) {
                $limit = 1000;
            }

            $query->join($pivotTable, $tableName . '.id', '=', $pivotTable . '.' . $foreignKey)
                  ->where($pivotTable . '.language_id', $languageId)
                  ->select($tableName . '.id', $pivotTable . '.name');
            
            if ($keyword) {
                $query->where($pivotTable . '.name', 'like', '%' . $keyword . '%');
            }
        } else {
            // Standard models (User, etc.)
            $query->select('id', 'name'); // Assume 'name' exists
            if ($keyword) {
                $query->where('name', 'like', '%' . $keyword . '%');
            }
        }

        $query->orderBy('id', 'desc');

        return $query->take($limit)->get();
    }
    
    /**
     * Lấy dữ liệu widget theo keyword (cho Frontend)
     * @param string $keyword Keyword của widget
     * @return Widget|null Widget đã xử lý hoặc null nếu không tìm thấy
     */
    public function getData($keyword)
    {
        $widget = Widget::where('keyword', $keyword)
            ->where('publish', 2)
            ->first();
            
        if (!$widget) return null;
        
        return $this->processWidgetData($widget);
    }
    
    /**
     * Lấy nhiều widgets theo mảng keywords (tối ưu 1 query thay vì N queries)
     * @param array $keywords Mảng các keyword cần lấy
     * @return array Dữ liệu dạng ['keyword' => widgetData]
     */
    public function getMultipleData(array $keywords): array
    {
        if (empty($keywords)) {
            return [];
        }
        
        $widgets = Widget::whereIn('keyword', $keywords)
            ->where('publish', 2)
            ->get();
            
        $result = [];
        
        foreach ($widgets as $widget) {
            // Xử lý từng widget tương tự getData()
            $processedWidget = $this->processWidgetData($widget);
            $result[$widget->keyword] = $processedWidget;
        }
        
        return $result;
    }
    
    /**
     * Xử lý dữ liệu widget (helper cho getData và getMultipleData)
     * @param Widget $widget Widget model cần xử lý
     * @return Widget Widget đã được gắn items_data
     */
    protected function processWidgetData(Widget $widget): Widget
    {
        $options = $widget->options;
        $autoPromotion = $options['_global']['auto_promotion'] ?? false;
        
        // Kiểm tra model chính xác
        $isProductModel = $widget->model === 'App\\Models\\Product';
        $isProductCatalogueModel = $widget->model === 'App\\Models\\ProductCatalogue';
        
        // ProductCatalogue với option category_with_products: trả về format blocks với sản phẩm
        if ($isProductCatalogueModel && ($options['_global']['category_with_products'] ?? false)) {
            $widget->items_data = $this->buildCategoryBlocksData($widget);
            return $widget;
        }
        
        // Xử lý auto_promotion = true - chỉ áp dụng cho Product
        if ($autoPromotion && $isProductModel) {
            if (self::$cachedActivePromotionIds === null) {
                self::$cachedActivePromotionIds = Promotion::expiryStatus('active')
                    ->where('publish', '2')
                    ->pluck('id');
                
                if (self::$cachedActivePromotionIds->isNotEmpty()) {
                    self::$cachedPromotionProductIds = DB::table('promotion_product_variant')
                        ->whereIn('promotion_id', self::$cachedActivePromotionIds)
                        ->pluck('product_id')
                        ->toArray();
                    
                    self::$cachedPromotionCatalogueIds = DB::table('promotion_product_catalogue')
                        ->whereIn('promotion_id', self::$cachedActivePromotionIds)
                        ->pluck('product_catalogue_id');
                    
                    self::$cachedProductIdsFromCatalogues = [];
                    if (self::$cachedPromotionCatalogueIds->isNotEmpty()) {
                        self::$cachedProductIdsFromCatalogues = DB::table('product_catalogue_product')
                            ->whereIn('product_catalogue_id', self::$cachedPromotionCatalogueIds)
                            ->pluck('product_id')
                            ->toArray();
                    }
                } else {
                    self::$cachedPromotionProductIds = [];
                    self::$cachedPromotionCatalogueIds = collect([]);
                    self::$cachedProductIdsFromCatalogues = [];
                }
            }
            
            $activePromotionIds = self::$cachedActivePromotionIds;
            
            if ($activePromotionIds->isNotEmpty()) {
                $limit = $options['_global']['items_limit'] ?? 10;
                
                if (self::$cachedAutoPromotionProducts === null) {
                    $allProductIds = array_unique(array_merge(
                        self::$cachedPromotionProductIds, 
                        self::$cachedProductIdsFromCatalogues
                    ));
                    
                    self::$cachedAutoPromotionProducts = Product::whereIn('id', $allProductIds)
                        ->where('publish', '2')
                        ->orderBy('created_at', 'desc')
                        ->with(['languages', 'variants', 'reviews', 'product_catalogues'])
                        ->get();
                    
                    $languageId = config('app.language_id', 1);
                    self::$cachedMappedProducts = $this->mapProductsForFrontendBatch(self::$cachedAutoPromotionProducts, $languageId);
                }
                
                $widget->items_data = self::$cachedMappedProducts->take($limit)->values();
            } else {
                $widget->items_data = collect([]);
            }
        } elseif ($isProductModel) {
            $productIds = $widget->model_id ?? [];
            $limit = $options['_global']['items_limit'] ?? 10;
            
            if (!empty($productIds)) {
                $products = Product::whereIn('id', $productIds)
                    ->where('publish', '2')
                    ->with(['languages', 'variants', 'reviews'])
                    ->take($limit)
                    ->get();
                
                $languageId = config('app.language_id', 1);
                $widget->items_data = $this->mapProductsForFrontendBatch($products, $languageId);
            } else {
                $widget->items_data = collect([]);
            }
        } else {
            // Các model khác (ProductCatalogue simple, PostCatalogue, Post, etc.)
            $widget->items_data = $widget->items;
        }

        return $widget;
    }
    
    /**
     * Build category blocks data với sản phẩm (cho RecommendedForYou)
     */
    protected function buildCategoryBlocksData(Widget $widget): array
    {
        $parentCategoryIds = $widget->model_id ?? [];
        if (empty($parentCategoryIds)) {
            return ['main_title' => $widget->name ?? 'Đề xuất cho bạn', 'blocks' => []];
        }
        
        $languageId = config('app.language_id', 1);
        $options = $widget->options ?? [];
        $itemsPerCategory = $options['_global']['items_per_category'] ?? 12;
        
        // Use cached loading for parent categories
        $parentCats = \App\Models\ProductCatalogue::getCachedWithLanguages($parentCategoryIds)->keyBy('id');
        
        // Use cached loading for children
        $childCats = \App\Models\ProductCatalogue::getCachedChildrenByParentIds($parentCategoryIds);
        
        $childrenByParent = $childCats->groupBy('parent_id');
        $allChildIds = $childCats->pluck('id')->toArray();
        
        $productCatalogue = [];
        if (!empty($allChildIds)) {
            $productCatalogue = DB::table('product_catalogue_product')
                ->whereIn('product_catalogue_id', $allChildIds)
                ->get()
                ->groupBy('product_catalogue_id');
        }
        
        $allProductIds = $productCatalogue->flatten()->pluck('product_id')->unique()->toArray();
        
        $allProducts = collect([]);
        if (!empty($allProductIds)) {
            $allProducts = Product::whereIn('id', $allProductIds)
                ->where('publish', 2)
                ->with(['languages', 'variants', 'reviews'])
                ->get()
                ->keyBy('id');
        }
        
        $mappedAllProducts = collect([]);
        if ($allProducts->isNotEmpty()) {
            $mappedAllProducts = $this->mapProductsForFrontendBatch($allProducts->values(), $languageId);
            $mappedAllProducts = $mappedAllProducts->keyBy('id');
        }
        
        $blocks = [];
        
        foreach ($parentCategoryIds as $parentId) {
            $parentCat = $parentCats[$parentId] ?? null;
            if (!$parentCat) continue;
            
            $parentLang = $parentCat->languages->firstWhere('id', $languageId);
            $parentName = $parentLang?->pivot?->name ?? $parentCat->languages->first()?->pivot?->name ?? 'N/A';
            
            $children = $childrenByParent[$parentId] ?? collect([]);
            $childCatsData = $children->map(function ($child) use ($languageId) {
                $childLang = $child->languages->firstWhere('id', $languageId);
                $childName = $childLang?->pivot?->name ?? $child->languages->first()?->pivot?->name ?? 'N/A';
                return [
                    'id' => $child->id,
                    'name' => $childName,
                    'image' => $child->image,
                ];
            });
            
            $productsByChild = [];
            $blockAllProducts = collect([]);
            
            foreach ($childCatsData as $child) {
                $childId = $child['id'];
                $childName = $child['name'];
                
                $childProductIds = ($productCatalogue[$childId] ?? collect([]))->pluck('product_id')->unique()->toArray();
                
                $childProducts = collect($childProductIds)
                    ->map(fn($pid) => $mappedAllProducts[$pid] ?? null)
                    ->filter()
                    ->take($itemsPerCategory)
                    ->values();
                
                $childProducts = $childProducts->map(function ($product) use ($childName) {
                    $product['category_name'] = $childName;
                    return $product;
                });
                
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
     * Lấy dữ liệu widget danh mục (cho section "Đề xuất cho bạn")
     * @deprecated Use getMultipleData with category_with_products option instead
     */
    public function getCategoryWidgetData($keyword)
    {
        $widget = Widget::where('keyword', $keyword)
            ->where('publish', 2)
            ->first();
            
        if (!$widget || $widget->model !== 'App\\Models\\ProductCatalogue') {
            return null;
        }
        
        return $this->buildCategoryBlocksData($widget);
    }
    
    /**
     * Chuyển đổi Product model sang format frontend
     * Bao gồm: thông tin sản phẩm, giá, stock, reviews và danh mục
     * 
     * @deprecated Use mapProductsForFrontendBatch for better performance
     */
    private function mapProductForFrontend($product, $languageId, $categoryName = null)
    {
        // Use batch method for single product
        $results = $this->mapProductsForFrontendBatch(collect([$product]), $languageId, $categoryName);
        return $results->first();
    }
    
    /**
     * Batch process multiple products for frontend
     * Optimized to reduce N+1 queries
     */
    private function mapProductsForFrontendBatch($products, $languageId, $defaultCategoryName = null)
    {
        if ($products->isEmpty()) {
            return collect([]);
        }
        
        $productIds = $products->pluck('id')->toArray();
        $variantIds = $products->flatMap(fn($p) => $p->variants->pluck('id'))->toArray();
        
        // Batch load product languages (canonicals)
        $productLanguages = DB::table('product_language')
            ->whereIn('product_id', $productIds)
            ->where('language_id', $languageId)
            ->get()
            ->keyBy('product_id');
        
        // Batch load product stocks
        $productStocks = DB::table('product_warehouse_stocks')
            ->whereIn('product_id', $productIds)
            ->selectRaw('product_id, SUM(stock_quantity) as total_stock')
            ->groupBy('product_id')
            ->get()
            ->keyBy('product_id');
        
        // Batch load variant stocks
        $variantStocks = [];
        if (!empty($variantIds)) {
            $variantStocks = DB::table('product_variant_warehouse_stocks')
                ->whereIn('product_variant_id', $variantIds)
                ->selectRaw('product_variant_id, SUM(stock_quantity) as total_stock')
                ->groupBy('product_variant_id')
                ->get()
                ->keyBy('product_variant_id');
        }
        
        // Batch load category data (always load for PromotionPricingService cache)
        $categoryPivots = DB::table('product_catalogue_product')
            ->whereIn('product_id', $productIds)
            ->get()
            ->groupBy('product_id');
        
        // Batch load category names if not provided
        $categoryNames = [];
        if (!$defaultCategoryName && $categoryPivots->isNotEmpty()) {
            $catalogueIds = $categoryPivots->flatten()->pluck('product_catalogue_id')->unique()->toArray();
            
            if (!empty($catalogueIds)) {
                // Use shared cache from ProductCatalogue model
                $cachedCatalogues = \App\Models\ProductCatalogue::getCachedWithLanguages($catalogueIds)->keyBy('id');
                
                foreach ($categoryPivots as $productId => $pivots) {
                    $catId = $pivots->first()->product_catalogue_id ?? null;
                    if ($catId && isset($cachedCatalogues[$catId])) {
                        $cat = $cachedCatalogues[$catId];
                        $catLang = $cat->languages->firstWhere('id', $languageId);
                        $categoryNames[$productId] = $catLang?->pivot?->name ?? $cat->languages->first()?->pivot?->name ?? '';
                    }
                }
            }
        }
        
        // Create pricing service once and preload all promotion data
        $pricingService = new \App\Services\Impl\V1\Promotion\PromotionPricingService();
        
        // Inject pre-loaded catalogue data to avoid duplicate queries
        if (!empty($categoryPivots)) {
            $catalogueData = [];
            foreach ($categoryPivots as $productId => $pivots) {
                $catalogueData[$productId] = $pivots->pluck('product_catalogue_id')->toArray();
            }
            \App\Services\Impl\V1\Promotion\PromotionPricingService::injectProductCatalogueCache($catalogueData);
        }
        
        $pricingService->preloadForProducts($productIds);
        
        return $products->map(function ($product) use (
            $languageId, $defaultCategoryName, $productLanguages, $productStocks, 
            $variantStocks, $categoryNames, $pricingService
        ) {
            $price = $product->retail_price ?? 0;
            
            // Get canonical and name from pre-loaded data
            $productLang = $productLanguages[$product->id] ?? null;
            $canonical = $productLang?->canonical;
            $name = $productLang?->name ?? $product->name ?? '';
            
            // Get stock from pre-loaded data
            $totalStock = $productStocks[$product->id]->total_stock ?? 0;
            
            // Get category name
            $categoryName = $defaultCategoryName ?? ($categoryNames[$product->id] ?? '');
            
            // Check for variants
            $hasVariants = $product->variants->count() > 0;
            $variants = [];
            
            if ($hasVariants) {
                $variants = $product->variants->map(function ($variant) use ($variantStocks) {
                    $variantStock = $variantStocks[$variant->id]->total_stock ?? 0;
                    return [
                        'id' => $variant->id,
                        'name' => $variant->name ?? 'Phiên bản ' . $variant->id,
                        'price' => $variant->price ?? 0,
                        'stock' => (int) $variantStock,
                        'image' => $variant->image ?? null,
                    ];
                })->toArray();
            }
            
            // Get real review data from reviews relation
            $reviews = $product->reviews ?? collect([]);
            $publishedReviews = $reviews->where('publish', 2);
            $reviewCount = $publishedReviews->count();
            $avgRating = $reviewCount > 0 ? round($publishedReviews->avg('score'), 1) : 5.0;
            
            // Calculate promotion pricing (service is reused)
            $priceData = $pricingService->calculateProductPrice($product, $price);
            
            // Determine badge based on promotion
            $badge = null;
            if ($priceData['has_discount']) {
                $badge = 'sale';
            } elseif (rand(1, 10) <= 2) {
                $badge = rand(0, 1) ? 'best_sale' : 'new';
            }
            
            return [
                'id' => $product->id,
                'name' => $name,
                'canonical' => $canonical,
                'image' => $product->image,
                'category_name' => $categoryName,
                'price' => $priceData['original_price'],
                'original_price' => $priceData['original_price'],
                'sale_price' => $priceData['final_price'],
                'discount_amount' => $priceData['discount_amount'],
                'discount_percent' => $priceData['discount_percent'],
                'applied_promotions' => $priceData['applied_promotions'],
                'is_combined_discount' => $priceData['is_combined'],
                'has_discount' => $priceData['has_discount'],
                'total_stock' => (int) $totalStock,
                'sold' => 0,
                'has_variants' => $hasVariants,
                'variants' => $variants,
                'rating' => $avgRating,
                'review_count' => $reviewCount,
                'badge' => $badge,
            ];
        });
    }
}

