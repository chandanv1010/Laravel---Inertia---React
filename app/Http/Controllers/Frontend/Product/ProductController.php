<?php

namespace App\Http\Controllers\Frontend\Product;

use App\Http\Controllers\Controller;
use App\Models\Router;
use Illuminate\Http\Request;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Voucher\VoucherServiceInterface;
use App\Helpers\BreadcrumbHelper;
use App\Helpers\SeoHelper;
use Inertia\Inertia;
use Inertia\Response;

use App\Services\Interfaces\Widget\WidgetServiceInterface;
use App\Http\Resources\Product\ProductResource;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    protected ProductServiceInterface $productService;
    protected WidgetServiceInterface $widgetService;
    protected VoucherServiceInterface $voucherService;

    public function __construct(
        ProductServiceInterface $productService,
        WidgetServiceInterface $widgetService,
        VoucherServiceInterface $voucherService
    ) {
        $this->productService = $productService;
        $this->widgetService = $widgetService;
        $this->voucherService = $voucherService;
    }

    /**
     * Hiển thị chi tiết sản phẩm
     * 
     * 1. Lấy chi tiết sản phẩm
     * 2. Lấy danh mục sản phẩm
     * 3. Lấy chương trình khuyến mãi (đã tích hợp trong service)
     * 4. Lấy reviews (đã tích hợp trong service)
     * 5. Lấy vouchers (đã tích hợp trong load relation nếu có hoặc fetch riêng)
     * 6. Tính giá discount (PromotionPricingService đã xử lý)
     * 7. Sản phẩm cùng danh mục
     * 8. Sản phẩm gợi ý (Pending - null)
     * 9. Lấy widget sản phẩm khuyến mãi
     */
    public function show(Router $router): Response
    {
        $productId = $router->routerable_id;
        $languageId = config('app.language_id', 1);

        $product = $this->productService->show($productId);
        
        if (!$product || $product->publish != 2) {
            // TODO: Return custom 404 view instead of abort
            abort(404);
        }

        $catalogue = $product->product_catalogue ?? $product->product_catalogues->first();
        $relatedProducts = [];
        
        if ($catalogue) {
            $request = new Request([
                'product_catalogue_id' => $catalogue->id,
                'publish' => 2,
                'perpage' => 10, 
            ]);
            $relatedProductsData = $this->productService->paginate($request);
            $relatedProducts = $relatedProductsData->items();
        }

        $promotionalWidget = $this->widgetService->getData('san-pham-khuyen-mai');
        $suggestedProducts = null;

        // Get applicable vouchers
        $vouchers = $this->voucherService->getApplicableVouchersForProduct($product->id);

        // Find best free shipping voucher for display in ProductPriceDetail
        $freeshipVoucher = null;
        foreach ($vouchers as $voucher) {
            if ($voucher['type'] === 'free_shipping') {
                if (!$freeshipVoucher || $voucher['min_order_value'] < $freeshipVoucher['min_order_value']) {
                    $freeshipVoucher = $voucher;
                }
            }
        }

        $breadcrumbs = BreadcrumbHelper::fromItem($product, $catalogue, $languageId);
        $seo = SeoHelper::fromModel($product, $languageId);

        return Inertia::render('frontend/product/detail/index', [
            'product' => new ProductResource($product), // Wrap with Resource to flatten data
            'relatedProducts' => $relatedProducts,
            'promotionalWidget' => $promotionalWidget,
            'suggestedProducts' => $suggestedProducts,
            'vouchers' => $vouchers,
            'freeship_voucher' => $freeshipVoucher,
            'breadcrumbs' => $breadcrumbs,
            'seo' => $seo,
            'catalogue' => $catalogue,
        ]);
    }
}
