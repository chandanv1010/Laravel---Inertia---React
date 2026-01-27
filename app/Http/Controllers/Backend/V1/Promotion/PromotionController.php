<?php

namespace App\Http\Controllers\Backend\V1\Promotion;

use App\Http\Controllers\Backend\BaseController;
use App\Services\Interfaces\Promotion\PromotionServiceInterface;
use App\Services\Interfaces\Customer\CustomerCatalogueServiceInterface;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Lang;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class PromotionController extends BaseController
{
    use AuthorizesRequests;

    /** @var PromotionServiceInterface */
    protected $service;

    public function __construct(
        PromotionServiceInterface $service,
        protected CustomerCatalogueServiceInterface $customerCatalogueService,
        protected ProductServiceInterface $productService,
        protected ProductCatalogueServiceInterface $productCatalogueService
    )
    {
        $this->service = $service;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách khuyến mãi
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'promotion:index');

        $promotions = $this->service->paginate($request);
        
        $promotions->getCollection()->transform(function ($promotion) {
            if ($promotion->discount_value) {
                $promotion->discount_value = (int) $promotion->discount_value;
            }
            if ($promotion->condition_value) {
                $promotion->condition_value = (int) $promotion->condition_value;
            }
            return $promotion;
        });
        
        return Inertia::render('backend/promotion/promotion/index', [
            'promotions' => $promotions
        ]);
    }

    /**
     * Hiển thị form tạo mới khuyến mãi
     *
     * @param Request $request
     * @return Response
     */
    public function create(Request $request): Response
    {
        $this->authorize('modules', 'promotion:store');

        $type = $request->get('type', 'order_discount');
        
        $viewMap = [
            'order_discount' => 'backend/promotion/promotion/order-discount',
            'product_discount' => 'backend/promotion/promotion/product-discount',
            'buy_x_get_y' => 'backend/promotion/promotion/buy-x-get-y',
            'combo' => 'backend/promotion/promotion/combo',
        ];
        
        $view = $viewMap[$type] ?? 'backend/promotion/promotion/order-discount';
        
        $customerGroups = $this->customerCatalogueService->getDropdown();
        
        $data = [
            'customerGroups' => $customerGroups,
        ];
        
        if (in_array($type, ['product_discount', 'buy_x_get_y', 'combo'])) {
            $products = $this->productService->getForPromotion(50);
            $productCatalogues = $this->productCatalogueService->getDropdownWithHierarchy();
            
            $data['initialProducts'] = $products;
            $data['productCatalogues'] = $productCatalogues;
        }
        
        return Inertia::render($view, $data);
    }

    /**
     * Lưu khuyến mãi mới
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('modules', 'promotion:store');

        $response = $this->service->save($request);
        
        return $this->handleAction($request, $response, redirectRoute: 'promotion.promotion.index');
    }

    /**
     * Hiển thị form chỉnh sửa khuyến mãi
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response
    {
        $this->authorize('modules', 'promotion:update');

        $promotion = $this->service->show($id);
        $promotion->load(['product_catalogues.current_languages', 'product_catalogues.languages']);
        
        $viewMap = [
            'order_discount' => 'backend/promotion/promotion/order-discount',
            'product_discount' => 'backend/promotion/promotion/product-discount',
            'buy_x_get_y' => 'backend/promotion/promotion/buy-x-get-y',
            'combo' => 'backend/promotion/promotion/combo',
        ];
        
        $view = $viewMap[$promotion->type] ?? 'backend/promotion/promotion/order-discount';

        $customerGroups = $this->customerCatalogueService->getDropdown();
        
        $promotionData = [
            'id' => $promotion->id,
            'name' => $promotion->name,
            'type' => $promotion->type,
            'discount_type' => $promotion->discount_type,
            'discount_value' => $promotion->discount_value ? (int) $promotion->discount_value : null,
            'max_discount_value' => $promotion->max_discount_value ? (int) $promotion->max_discount_value : null,
            'condition_type' => $promotion->condition_type,
            'condition_value' => $promotion->condition_value ? (int) $promotion->condition_value : null,
            'customer_group_type' => $promotion->customer_group_type,
            'customer_group_ids' => $promotion->customer_groups->pluck('id')->toArray(),
            'combine_with_order_discount' => $promotion->combine_with_order_discount,
            'combine_with_product_discount' => $promotion->combine_with_product_discount,
            'combine_with_free_shipping' => $promotion->combine_with_free_shipping,
            'start_date' => $promotion->start_date ? $promotion->start_date->format('Y-m-d\TH:i') : null,
            'end_date' => $promotion->end_date ? $promotion->end_date->format('Y-m-d\TH:i') : null,
            'no_end_date' => $promotion->no_end_date,
            'publish' => (string)$promotion->publish,
            'apply_source' => $promotion->apply_source,
            'product_variant_ids' => $promotion->product_variants->pluck('id')->toArray(),
            'product_items' => \Illuminate\Support\Facades\DB::table('promotion_product_variant')
                ->where('promotion_id', $promotion->id)
                ->get()
                ->map(function($row) {
                    if ($row->product_variant_id) {
                        $variant = \App\Models\ProductVariant::with('product')->find($row->product_variant_id);
                        if ($variant) {
                            return [
                                'id' => $variant->id,
                                'name' => $variant->name ?? ($variant->product ? $variant->product->name : ''),
                                'sku' => $variant->sku,
                                'price' => $variant->retail_price ?? $variant->wholesale_price ?? 0,
                                'image' => ($variant->product && isset($variant->product->album) && is_array($variant->product->album) && count($variant->product->album) > 0) 
                                    ? $variant->product->album[0] 
                                    : null,
                                'productId' => $variant->product_id,
                            ];
                        }
                    } elseif ($row->product_id) {
                        $product = \App\Models\Product::find($row->product_id);
                        if ($product) {
                            return [
                                'id' => $product->id,
                                'name' => $product->current_language->name ?? $product->name ?? '',
                                'sku' => $product->sku ?? '',
                                'price' => $product->retail_price ?? $product->wholesale_price ?? 0,
                                'image' => (isset($product->album) && is_array($product->album) && count($product->album) > 0) 
                                    ? $product->album[0] 
                                    : null,
                                'productId' => $product->id,
                            ];
                        }
                    }
                    return null;
                })
                ->filter()
                ->values()
                ->toArray(),
            'product_catalogue_ids' => $promotion->product_catalogues->pluck('id')->toArray(),
            'product_catalogue_items' => $promotion->product_catalogues->map(function($cat) {
                $name = '';
                if ($cat->relationLoaded('current_languages') && $cat->current_languages->isNotEmpty()) {
                    $language = $cat->current_languages->first();
                    if ($language && $language->pivot) {
                        $name = $language->pivot->name ?? '';
                    }
                }
                
                if (empty($name) && $cat->relationLoaded('languages') && $cat->languages->isNotEmpty()) {
                    $language = $cat->languages->first();
                    if ($language && $language->pivot) {
                        $name = $language->pivot->name ?? '';
                    }
                }
                
                if (empty($name)) {
                    $languageId = config('app.language_id', 1);
                    $pivotData = \Illuminate\Support\Facades\DB::table('product_catalogue_language')
                        ->where('product_catalogue_id', $cat->id)
                        ->where('language_id', $languageId)
                        ->first();
                    
                    if ($pivotData && isset($pivotData->name)) {
                        $name = $pivotData->name;
                    } else {
                        $pivotData = \Illuminate\Support\Facades\DB::table('product_catalogue_language')
                            ->where('product_catalogue_id', $cat->id)
                            ->first();
                        if ($pivotData && isset($pivotData->name)) {
                            $name = $pivotData->name;
                        }
                    }
                }
                
                return [
                    'id' => $cat->id,
                    'name' => $name,
                    'image' => $cat->image ?? null,
                ];
            })->values()->toArray(),
        ];

        if ($promotion->type === 'buy_x_get_y') {
            $buyXGetYItems = \Illuminate\Support\Facades\DB::table('promotion_buy_x_get_y_items')
                ->where('promotion_id', $promotion->id)
                ->get();

            $buyItems = $buyXGetYItems->where('item_type', 'buy');
            $getItems = $buyXGetYItems->where('item_type', 'get');

            $firstBuyItem = $buyItems->first();
            if ($firstBuyItem) {
                $promotionData['buy_min_quantity'] = $firstBuyItem->quantity;
                $promotionData['buy_condition_type'] = $firstBuyItem->min_order_value ? 'min_order_value' : 'min_quantity';
                $promotionData['buy_min_order_value'] = $firstBuyItem->min_order_value ? (int)$firstBuyItem->min_order_value : null;
                $promotionData['buy_apply_type'] = $firstBuyItem->apply_type === 'product_catalogue' ? 'product_catalogue' : 'product';

                if ($firstBuyItem->apply_type === 'product' || $firstBuyItem->apply_type === 'product_variant') {
                    $buyProductIds = $buyItems->where('apply_type', 'product')->pluck('product_id')->filter()->toArray();
                    $buyVariantIds = $buyItems->where('apply_type', 'product_variant')->pluck('product_variant_id')->filter()->toArray();
                    
                    $allIds = array_merge($buyProductIds, $buyVariantIds);
                    $promotionData['buy_product_ids'] = $allIds;
                    
                    $productItems = [];
                    
                    if (!empty($buyProductIds)) {
                        $products = \App\Models\Product::whereIn('id', $buyProductIds)->get();
                        foreach ($products as $product) {
                            $productItems[] = [
                                'id' => $product->id,
                                'name' => $product->current_language->name ?? $product->name ?? '',
                                'sku' => $product->sku ?? '',
                                'image' => (isset($product->album) && is_array($product->album) && count($product->album) > 0) 
                                    ? $product->album[0] 
                                    : null,
                            ];
                        }
                    }
                    
                    if (!empty($buyVariantIds)) {
                        $variants = \App\Models\ProductVariant::with('product')->whereIn('id', $buyVariantIds)->get();
                        foreach ($variants as $variant) {
                            $productItems[] = [
                                'id' => $variant->id,
                                'name' => $variant->name ?? ($variant->product ? $variant->product->name : ''),
                                'sku' => $variant->sku,
                                'image' => ($variant->product && isset($variant->product->album) && is_array($variant->product->album) && count($variant->product->album) > 0) 
                                    ? $variant->product->album[0] 
                                    : null,
                            ];
                        }
                    }
                    
                    $promotionData['buy_product_items'] = $productItems;
                } else {
                    $buyCatalogueIds = $buyItems->where('apply_type', 'product_catalogue')->pluck('product_catalogue_id')->filter()->toArray();
                    $promotionData['buy_product_catalogue_ids'] = $buyCatalogueIds;
                    $promotionData['buy_product_catalogue_items'] = \App\Models\ProductCatalogue::with(['current_languages', 'languages'])
                        ->whereIn('id', $buyCatalogueIds)
                        ->get()
                        ->map(function($cat) {
                            $name = '';
                            if ($cat->relationLoaded('current_languages') && $cat->current_languages->isNotEmpty()) {
                                $language = $cat->current_languages->first();
                                if ($language && $language->pivot) {
                                    $name = $language->pivot->name ?? '';
                                }
                            }
                            
                            if (empty($name) && $cat->relationLoaded('languages') && $cat->languages->isNotEmpty()) {
                                $language = $cat->languages->first();
                                if ($language && $language->pivot) {
                                    $name = $language->pivot->name ?? '';
                                }
                            }
                            
                            if (empty($name)) {
                                $languageId = config('app.language_id', 1);
                                $pivotData = \Illuminate\Support\Facades\DB::table('product_catalogue_language')
                                    ->where('product_catalogue_id', $cat->id)
                                    ->where('language_id', $languageId)
                                    ->first();
                                
                                if ($pivotData && isset($pivotData->name)) {
                                    $name = $pivotData->name;
                                }
                            }
                            
                            return [
                                'id' => $cat->id,
                                'name' => $name,
                                'image' => $cat->image ?? null,
                            ];
                        })->toArray();
                }
            }

            $firstGetItem = $getItems->first();
            if ($firstGetItem) {
                $promotionData['get_quantity'] = $firstGetItem->quantity;
                $promotionData['get_apply_type'] = $firstGetItem->apply_type === 'product_catalogue' ? 'product_catalogue' : 'product';

                if ($firstGetItem->apply_type === 'product' || $firstGetItem->apply_type === 'product_variant') {
                    $getProductIds = $getItems->where('apply_type', 'product')->pluck('product_id')->filter()->toArray();
                    $getVariantIds = $getItems->where('apply_type', 'product_variant')->pluck('product_variant_id')->filter()->toArray();
                    
                    $allIds = array_merge($getProductIds, $getVariantIds);
                    $promotionData['get_product_ids'] = $allIds;
                    
                    $productItems = [];
                    
                    if (!empty($getProductIds)) {
                        $products = \App\Models\Product::whereIn('id', $getProductIds)->get();
                        foreach ($products as $product) {
                            $productItems[] = [
                                'id' => $product->id,
                                'name' => $product->current_language->name ?? $product->name ?? '',
                                'sku' => $product->sku ?? '',
                                'image' => (isset($product->album) && is_array($product->album) && count($product->album) > 0) 
                                    ? $product->album[0] 
                                    : null,
                            ];
                        }
                    }
                    
                    if (!empty($getVariantIds)) {
                        $variants = \App\Models\ProductVariant::with('product')->whereIn('id', $getVariantIds)->get();
                        foreach ($variants as $variant) {
                            $productItems[] = [
                                'id' => $variant->id,
                                'name' => $variant->name ?? ($variant->product ? $variant->product->name : ''),
                                'sku' => $variant->sku,
                                'image' => ($variant->product && isset($variant->product->album) && is_array($variant->product->album) && count($variant->product->album) > 0) 
                                    ? $variant->product->album[0] 
                                    : null,
                            ];
                        }
                    }
                    
                    $promotionData['get_product_items'] = $productItems;
                } else {
                    $getCatalogueIds = $getItems->where('apply_type', 'product_catalogue')->pluck('product_catalogue_id')->filter()->toArray();
                    $promotionData['get_product_catalogue_ids'] = $getCatalogueIds;
                    $promotionData['get_product_catalogue_items'] = \App\Models\ProductCatalogue::with(['current_languages', 'languages'])
                        ->whereIn('id', $getCatalogueIds)
                        ->get()
                        ->map(function($cat) {
                            $name = '';
                            if ($cat->relationLoaded('current_languages') && $cat->current_languages->isNotEmpty()) {
                                $language = $cat->current_languages->first();
                                if ($language && $language->pivot) {
                                    $name = $language->pivot->name ?? '';
                                }
                            }
                            
                            if (empty($name) && $cat->relationLoaded('languages') && $cat->languages->isNotEmpty()) {
                                $language = $cat->languages->first();
                                if ($language && $language->pivot) {
                                    $name = $language->pivot->name ?? '';
                                }
                            }
                            
                            if (empty($name)) {
                                $languageId = config('app.language_id', 1);
                                $pivotData = \Illuminate\Support\Facades\DB::table('product_catalogue_language')
                                    ->where('product_catalogue_id', $cat->id)
                                    ->where('language_id', $languageId)
                                    ->first();
                                
                                if ($pivotData && isset($pivotData->name)) {
                                    $name = $pivotData->name;
                                }
                            }
                            
                            return [
                                'id' => $cat->id,
                                'name' => $name,
                                'image' => $cat->image ?? null,
                            ];
                        })->toArray();
                }
            }

            $promotionData['max_apply_per_order'] = $promotion->condition_value ? (int)$promotion->condition_value : null;
        }

        if ($promotion->type === 'combo') {
            $promotionData['combo_price'] = $promotion->combo_price;
            
            $comboItems = $promotion->combo_items()->with([
                'product.languages', 
                'product.current_languages', 
                'product_variant.product.languages', 
                'product_variant.product.current_languages'
            ])->get();
            
            $promotionData['combo_items'] = $comboItems->map(function($item) {
                $productData = null;
                $variantData = null;
                
                if ($item->product_variant_id && $item->product_variant) {
                    $variant = $item->product_variant;
                    $product = $variant->product;
                    $variantData = [
                        'id' => $variant->id,
                        'name' => $variant->name ?? ($product ? $product->name : ''),
                        'sku' => $variant->sku,
                        'image' => ($product && isset($product->album) && is_array($product->album) && count($product->album) > 0) 
                            ? $product->album[0] 
                            : null,
                    ];
                    $productData = $product ? [
                        'id' => $product->id,
                        'name' => $product->current_language->name ?? $product->name ?? '',
                    ] : null;
                } elseif ($item->product_id && $item->product) {
                    $product = $item->product;
                    $productData = [
                        'id' => $product->id,
                        'name' => $product->current_language->name ?? $product->name ?? '',
                        'sku' => $product->sku ?? '',
                        'image' => (isset($product->album) && is_array($product->album) && count($product->album) > 0) 
                            ? $product->album[0] 
                            : null,
                    ];
                }
                
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity' => $item->quantity,
                    'product' => $productData,
                    'variant' => $variantData,
                ];
            })->toArray();
        }
        
        $data = [
            'promotion' => $promotionData,
            'customerGroups' => $customerGroups,
        ];
        
        if (in_array($promotion->type, ['product_discount', 'buy_x_get_y', 'combo'])) {
            $products = $this->productService->getForPromotion(50);
            $productCatalogues = $this->productCatalogueService->getDropdownWithHierarchy();
            
            $data['initialProducts'] = $products;
            $data['productCatalogues'] = $productCatalogues;
        }
        
        return Inertia::render($view, $data);
    }

    /**
     * Cập nhật khuyến mãi
     *
     * @param Request $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(Request $request, $id): RedirectResponse
    {
        $this->authorize('modules', 'promotion:update');

        $response = $this->service->save($request, $id);
        
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'type', 'discount_type', 'discount_value']);
        
        if ($onlyPublish) {
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'promotion.index', editRoute: 'promotion.edit');
    }

    /**
     * Xóa khuyến mãi
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id): RedirectResponse
    {
        $this->authorize('modules', 'promotion:delete');

        $response = $this->service->destroy($id);
        
        return redirect()->route('promotion.index')
            ->with('success', Lang::get('messages.delete_success'));
    }

    /**
     * Cập nhật nhiều khuyến mãi cùng lúc
     *
     * @param \App\Http\Requests\Promotion\Promotion\BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(\App\Http\Requests\Promotion\Promotion\BulkUpdateRequest $request): RedirectResponse
    {
        $this->authorize('modules', 'promotion:bulkUpdate');

        $response = $this->service->bulkUpdate($request);
        
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }
}

