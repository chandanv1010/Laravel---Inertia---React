<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use App\Services\Interfaces\Widget\WidgetServiceInterface;
use App\Services\Interfaces\Banner\BannerServiceInterface;
use App\Helpers\SeoHelper;

class HomeController extends Controller
{
    protected $widgetService;
    protected $bannerService;

    public function __construct(
        WidgetServiceInterface $widgetService,
        BannerServiceInterface $bannerService
    ) {
        $this->widgetService = $widgetService;
        $this->bannerService = $bannerService;
    }

    /**
     * Hiển thị trang chủ
     */
    public function index()
    {
        $widgetsRaw = $this->widgetService->getMultipleData([
            'category', 'hot-deals', 'top-selling', 'featured-products',
            'on-sale-products', 'deal-of-the-week', 'recommended-categories',
        ]);

        $bannersRaw = $this->bannerService->getMultipleByCodes([
            'main-slide', 'home-banner', 'daily-banner', 'promotion-deal-hot',
        ]);

        return Inertia::render('frontend/home/index', [
            'seo' => SeoHelper::home(),
            'widgets' => [
                'categorySlider' => $widgetsRaw['category']?->items_data ?? [],
                'hotDeals' => $widgetsRaw['hot-deals'] ?? null,
                'topSelling' => $widgetsRaw['top-selling'] ?? null,
                'featuredProducts' => $widgetsRaw['featured-products'] ?? null,
                'onSaleProducts' => $widgetsRaw['on-sale-products'] ?? null,
                'dealOfTheWeek' => $widgetsRaw['deal-of-the-week'] ?? null,
                'recommendedCategories' => $widgetsRaw['recommended-categories']?->items_data ?? null,
                'hotDealsBanner' => $bannersRaw['promotion-deal-hot'] ?? null,
            ],
            'banners' => [
                'home_slider' => $bannersRaw['main-slide'] ?? null,
                'home_banner' => $bannersRaw['home-banner'] ?? null,
                'daily_best_sells' => $bannersRaw['daily-banner'] ?? null,
            ],
        ]);
    }
}
