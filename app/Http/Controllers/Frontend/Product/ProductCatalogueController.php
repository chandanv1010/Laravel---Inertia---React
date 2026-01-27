<?php

namespace App\Http\Controllers\Frontend\Product;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use App\Helpers\SeoHelper;
use App\Helpers\BreadcrumbHelper;
use App\Helpers\RecursiveHelper;
use App\Helpers\CatalogueHelper;
use App\Models\ProductCatalogue;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ProductCatalogueController
 * Xử lý hiển thị danh mục sản phẩm và danh sách sản phẩm trên frontend
 */
class ProductCatalogueController extends Controller
{
    protected ProductServiceInterface $productService;
    protected ProductCatalogueServiceInterface $catalogueService;

    public function __construct(
        ProductServiceInterface $productService,
        ProductCatalogueServiceInterface $catalogueService
    ) {
        $this->productService = $productService;
        $this->catalogueService = $catalogueService;
    }

    /**
     * Hiển thị trang danh mục sản phẩm
     * Bao gồm: thông tin danh mục, danh sách sản phẩm, bộ lọc, breadcrumb và SEO
     */
    public function show(Router $router): Response
    {
        $request = request();
        $languageId = config('app.language_id', 1);
        
        $catalogueModel = $this->catalogueService->show($router->routerable_id);
        
        if (!$catalogueModel || $catalogueModel->publish != 2) {
            abort(404, 'Danh mục không tồn tại');
        }
        
        $catalogue = $catalogueModel;
        $catalogueLang = $catalogue->current_languages->first();
        $catalogueIds = RecursiveHelper::getAllChildIds(ProductCatalogue::class, $catalogue->id);
        
        // Convert sort value to column,direction format
        $sortValue = $request->input('sort', 'newest');
        $sortMap = [
            'newest' => [['order', 'desc'], ['id', 'desc']],
            'oldest' => [['order', 'asc'], ['id', 'asc']],
            'price_asc' => [['retail_price', 'asc']],
            'price_desc' => [['retail_price', 'desc']],
        ];
        $sort = $sortMap[$sortValue] ?? [['order', 'desc'], ['id', 'desc']];
        
        // Decode filtered category_ids and attributes if they are JSON strings
        $reqAttributes = $request->input('attributes');
        if (is_string($reqAttributes)) {
            $reqAttributes = json_decode($reqAttributes, true) ?? [];
        }
        
        $reqCategoryIds = $request->input('category_ids');
        if (is_string($reqCategoryIds)) {
            $reqCategoryIds = json_decode($reqCategoryIds, true) ?? [];
        }

        // If user filters by categories, use exactly what they selected (OR logic between categories)
        // Do NOT intersect with current catalogue children, otherwise selecting sibling categories (e.g. "Gia vị" + "Mì") 
        // will result in empty set if "Mì" is not child of "Gia vị".
        if (!empty($reqCategoryIds) && is_array($reqCategoryIds)) {
            $catalogueIds = $reqCategoryIds;
        }

        $paginateRequest = new Request([
            'type' => 'paginate',
            'publish' => '2',
            'perpage' => 20,
            'page' => $request->input('page', 1),
            'catalogue_ids' => $catalogueIds,
            'sort' => $sort,
            'attributes' => $reqAttributes,
            'min_price' => $request->input('min_price'),
            'max_price' => $request->input('max_price'),
        ]);
        
        $products = $this->productService->paginate($paginateRequest);
        
        // Transform products for frontend (add promotion info, language fallback)
        $mappedProducts = $this->catalogueService->mapProductsForFrontend(
            $products->items(), 
            $languageId, 
            is_array($reqCategoryIds) && !empty($reqCategoryIds) ? $reqCategoryIds : array_values(array_unique(array_merge([$catalogue->id], $catalogueIds)))
        );
        $products->setCollection(collect($mappedProducts));

        $availableFilters = $this->catalogueService->getFiltersForCatalogue($catalogue->id);
        $allCategories = $this->catalogueService->getAllCategoriesFlat();
        $breadcrumbs = BreadcrumbHelper::fromCatalogue($catalogue, $languageId);
        $seo = SeoHelper::fromModel($catalogue, $languageId);

        return Inertia::render('frontend/product-catalogue/index', [
            'catalogue' => CatalogueHelper::transformWithLanguageId($catalogue, $languageId, $router),
            'products' => $products,
            'filters' => $availableFilters,
            'allCategories' => $allCategories,
            'breadcrumbs' => $breadcrumbs,
            'seo' => $seo,
            'currentCatalogueIds' => is_array($reqCategoryIds) && !empty($reqCategoryIds) ? $reqCategoryIds : array_values(array_unique(array_merge([$catalogue->id], $catalogueIds))), // Pass selected or all valid
            'currentFilters' => [
                'sort' => $request->input('sort', 'newest'),
                'min_price' => $request->input('min_price'),
                'max_price' => $request->input('max_price'),
                'attributes' => $reqAttributes,
            ],
        ]);
    }


}
