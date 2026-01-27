<?php

namespace App\Http\Controllers\Backend\V1\Voucher;

use App\Http\Controllers\Backend\BaseController;
use App\Services\Interfaces\Voucher\VoucherServiceInterface;
use App\Services\Interfaces\Customer\CustomerCatalogueServiceInterface;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Lang;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class VoucherController extends BaseController
{
    use AuthorizesRequests;

    /** @var VoucherServiceInterface */
    protected $service;

    public function __construct(
        VoucherServiceInterface $service,
        protected CustomerCatalogueServiceInterface $customerCatalogueService,
        protected ProductServiceInterface $productService,
        protected ProductCatalogueServiceInterface $productCatalogueService
    )
    {
        $this->service = $service;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách voucher
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'voucher:index');

        $vouchers = $this->service->paginate($request);
        
        $vouchers->getCollection()->transform(function ($voucher) {
            if ($voucher->discount_value) {
                $voucher->discount_value = (int) $voucher->discount_value;
            }
            if ($voucher->condition_value) {
                $voucher->condition_value = (int) $voucher->condition_value;
            }
            return $voucher;
        });
        
        return Inertia::render('backend/voucher/voucher/index', [
            'vouchers' => $vouchers
        ]);
    }

    /**
     * Hiển thị form tạo mới voucher
     *
     * @param Request $request
     * @return Response
     */
    public function create(Request $request): Response
    {
        $this->authorize('modules', 'voucher:store');

        $type = $request->get('type', 'order_discount');
        
        $viewMap = [
            'order_discount' => 'backend/voucher/voucher/order-discount',
            'product_discount' => 'backend/voucher/voucher/product-discount',
            'buy_x_get_y' => 'backend/voucher/voucher/buy-x-get-y',
            'free_shipping' => 'backend/voucher/voucher/free-shipping',
        ];
        
        $view = $viewMap[$type] ?? 'backend/voucher/voucher/order-discount';
        
        $customerGroups = $this->customerCatalogueService->getDropdown();
        
        $data = [
            'customerGroups' => $customerGroups,
        ];
        
        if (in_array($type, ['product_discount', 'buy_x_get_y'])) {
            $products = $this->productService->getForPromotion(50);
            $productCatalogues = $this->productCatalogueService->getDropdownWithHierarchy();
            
            $data['initialProducts'] = $products;
            $data['productCatalogues'] = $productCatalogues;
        }
        
        return Inertia::render($view, $data);
    }

    /**
     * Lưu voucher mới
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('modules', 'voucher:store');

        $response = $this->service->save($request);
        
        return $this->handleAction($request, $response, redirectRoute: 'voucher.index');
    }

    /**
     * Hiển thị form chỉnh sửa voucher
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response
    {
        $this->authorize('modules', 'voucher:update');

        $voucher = $this->service->show($id);
        $voucher->load(['product_catalogues.current_languages', 'product_catalogues.languages']);

        $viewMap = [
            'order_discount' => 'backend/voucher/voucher/order-discount',
            'product_discount' => 'backend/voucher/voucher/product-discount',
            'buy_x_get_y' => 'backend/voucher/voucher/buy-x-get-y',
            'free_shipping' => 'backend/voucher/voucher/free-shipping',
        ];
        
        $view = $viewMap[$voucher->type] ?? 'backend/voucher/voucher/order-discount';

        $customerGroups = $this->customerCatalogueService->getDropdown();
        
        $voucherData = [
            'id' => $voucher->id,
            'code' => $voucher->code,
            'name' => $voucher->name,
            'type' => $voucher->type,
            'discount_type' => $voucher->discount_type,
            'discount_value' => $voucher->discount_value ? (int) $voucher->discount_value : null,
            'max_discount_value' => $voucher->max_discount_value ? (int) $voucher->max_discount_value : null,
            'condition_type' => $voucher->condition_type,
            'condition_value' => $voucher->condition_value ? (int) $voucher->condition_value : null,
            'customer_group_type' => $voucher->customer_group_type,
            'customer_group_ids' => $voucher->customer_groups->pluck('id')->toArray(),
            'combine_with_order_discount' => $voucher->combine_with_order_discount,
            'combine_with_product_discount' => $voucher->combine_with_product_discount,
            'combine_with_free_shipping' => $voucher->combine_with_free_shipping,
            'usage_limit' => $voucher->usage_limit ? (int) $voucher->usage_limit : null,
            'usage_count' => $voucher->usage_count ? (int) $voucher->usage_count : 0,
            'limit_per_customer' => $voucher->limit_per_customer,
            'allow_multiple_use' => $voucher->allow_multiple_use ?? true,
            'start_date' => $voucher->start_date ? $voucher->start_date->format('Y-m-d\TH:i') : null,
            'end_date' => $voucher->end_date ? $voucher->end_date->format('Y-m-d\TH:i') : null,
            'no_end_date' => $voucher->no_end_date,
            'publish' => (string)$voucher->publish,
            'apply_source' => $voucher->apply_source,
            'product_variant_ids' => $voucher->product_variants->pluck('id')->toArray(),
            'product_items' => \Illuminate\Support\Facades\DB::table('voucher_product_variant')
                ->where('voucher_id', $voucher->id)
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
            'product_catalogue_ids' => $voucher->product_catalogues->pluck('id')->toArray(),
            'product_catalogue_items' => $voucher->product_catalogues->map(function($cat) {
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
            })->values()->toArray(),
        ];

        if ($voucher->type === 'buy_x_get_y') {
            $buyXGetYItems = \Illuminate\Support\Facades\DB::table('voucher_buy_x_get_y_items')
                ->where('voucher_id', $voucher->id)
                ->get();

            $buyItems = $buyXGetYItems->where('item_type', 'buy');
            $getItems = $buyXGetYItems->where('item_type', 'get');

            $firstBuyItem = $buyItems->first();
            if ($firstBuyItem) {
                $voucherData['buy_min_quantity'] = $firstBuyItem->quantity;
                $voucherData['buy_condition_type'] = $firstBuyItem->min_order_value ? 'min_order_value' : 'min_quantity';
                $voucherData['buy_min_order_value'] = $firstBuyItem->min_order_value ? (int)$firstBuyItem->min_order_value : null;
                $voucherData['buy_apply_type'] = $firstBuyItem->apply_type === 'product_catalogue' ? 'product_catalogue' : 'product';

                if ($firstBuyItem->apply_type === 'product' || $firstBuyItem->apply_type === 'product_variant') {
                    $buyProductIds = $buyItems->where('apply_type', 'product')->pluck('product_id')->filter()->toArray();
                    $buyVariantIds = $buyItems->where('apply_type', 'product_variant')->pluck('product_variant_id')->filter()->toArray();
                    $allIds = array_merge($buyProductIds, $buyVariantIds);
                    $voucherData['buy_product_ids'] = $allIds;
                    
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
                    $voucherData['buy_product_items'] = $productItems;
                } else {
                    $buyCatalogueIds = $buyItems->where('apply_type', 'product_catalogue')->pluck('product_catalogue_id')->filter()->toArray();
                    $voucherData['buy_product_catalogue_ids'] = $buyCatalogueIds;
                    $voucherData['buy_product_catalogue_items'] = \App\Models\ProductCatalogue::with(['current_languages', 'languages'])
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
                $voucherData['get_quantity'] = $firstGetItem->quantity;
                $voucherData['get_apply_type'] = $firstGetItem->apply_type === 'product_catalogue' ? 'product_catalogue' : 'product';

                if ($firstGetItem->apply_type === 'product' || $firstGetItem->apply_type === 'product_variant') {
                    $getProductIds = $getItems->where('apply_type', 'product')->pluck('product_id')->filter()->toArray();
                    $getVariantIds = $getItems->where('apply_type', 'product_variant')->pluck('product_variant_id')->filter()->toArray();
                    $allIds = array_merge($getProductIds, $getVariantIds);
                    $voucherData['get_product_ids'] = $allIds;
                    
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
                    $voucherData['get_product_items'] = $productItems;
                } else {
                    $getCatalogueIds = $getItems->where('apply_type', 'product_catalogue')->pluck('product_catalogue_id')->filter()->toArray();
                    $voucherData['get_product_catalogue_ids'] = $getCatalogueIds;
                    $voucherData['get_product_catalogue_items'] = \App\Models\ProductCatalogue::with(['current_languages', 'languages'])
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

            $voucherData['max_apply_per_order'] = $voucher->condition_value ? (int)$voucher->condition_value : null;
        }
        
        $data = [
            'voucher' => $voucherData,
            'customerGroups' => $customerGroups,
        ];
        
        if (in_array($voucher->type, ['product_discount', 'buy_x_get_y'])) {
            $products = $this->productService->getForPromotion(50);
            $productCatalogues = $this->productCatalogueService->getDropdownWithHierarchy();
            
            $data['initialProducts'] = $products;
            $data['productCatalogues'] = $productCatalogues;
        }
        
        return Inertia::render($view, $data);
    }

    /**
     * Cập nhật voucher
     *
     * @param Request $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(Request $request, $id): RedirectResponse
    {
        $this->authorize('modules', 'voucher:update');

        $response = $this->service->save($request, $id);
        
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'type', 'discount_type', 'discount_value', 'code']);
        
        if ($onlyPublish) {
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'voucher.index', editRoute: 'voucher.edit');
    }

    /**
     * Xóa voucher
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id): RedirectResponse
    {
        $this->authorize('modules', 'voucher:delete');

        $response = $this->service->destroy($id);
        
        return redirect()->route('voucher.index')
            ->with('success', Lang::get('messages.delete_success'));
    }

    /**
     * Cập nhật nhiều voucher cùng lúc
     *
     * @param \App\Http\Requests\Voucher\Voucher\BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(\App\Http\Requests\Voucher\Voucher\BulkUpdateRequest $request): RedirectResponse
    {
        $this->authorize('modules', 'voucher:bulkUpdate');

        $response = $this->service->bulkUpdate($request);
        
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Tạo mã voucher tự động
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateCode(Request $request): JsonResponse
    {
        $code = $this->service->generateCode();
        return response()->json(['code' => $code]);
    }
}
