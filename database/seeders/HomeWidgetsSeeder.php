<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Slide;
use App\Models\Widget;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HomeWidgetsSeeder extends Seeder
{
    /**
     * Chạy seeder tạo các widgets và banner cho trang chủ
     */
    public function run(): void
    {
        $this->createHotDealsBanner();
        $this->createFeaturedProductsWidget();
        $this->createTopSellingWidget();
        $this->createOnSaleProductsWidget();
        $this->createDealOfTheWeekWidget();

        $this->command->info('Home Widgets & Banners seeded successfully!');
    }

    /**
     * Tạo banner Deal Hot Hôm Nay
     */
    protected function createHotDealsBanner(): void
    {
        // Tạo banner promotion-deal-hot
        $banner = Banner::updateOrCreate(
            ['code' => 'promotion-deal-hot'],
            [
                'name' => 'Deal Hot Hôm Nay',
                'code' => 'promotion-deal-hot',
                'position' => 'home',
                'description' => 'Banner countdown cho khuyến mãi hot',
                'width' => 400,
                'height' => 450,
                'publish' => '2',
                'user_id' => 1,
                'order' => 2,
            ]
        );

        // Xóa slides cũ
        Slide::where('banner_id', $banner->id)->forceDelete();

        // Tạo slide với countdown
        $endDate = now()->addDays(7)->endOfDay(); // Kết thúc sau 7 ngày

        Slide::create([
            'banner_id' => $banner->id,
            'name' => 'Deal Hot Tuần Này',
            'background_image' => '/userfiles/image/banner/hot-deal-bg.png',
            'background_color' => '#1a6f93',
            'elements' => [
                [
                    'id' => 'badge-1',
                    'type' => 'badge',
                    'content' => 'Khuyến mãi',
                    'position' => ['x' => 24, 'y' => 24],
                    'size' => ['width' => 100, 'height' => 28],
                    'style' => [
                        'fontSize' => '12px',
                        'fontWeight' => '600',
                        'color' => '#111827',
                        'backgroundColor' => '#facc15',
                        'borderRadius' => '20px',
                        'textAlign' => 'center',
                        'padding' => '6px 16px',
                    ],
                    'zIndex' => 10,
                    'animation' => ['type' => 'none', 'duration' => 500, 'delay' => 0, 'easing' => 'ease'],
                ],
                [
                    'id' => 'title-1',
                    'type' => 'text',
                    'content' => 'Pasta Ý Nhập Khẩu',
                    'position' => ['x' => 24, 'y' => 65],
                    'size' => ['width' => 280, 'height' => 40],
                    'style' => [
                        'fontSize' => '24px',
                        'fontWeight' => '700',
                        'color' => '#facc15',
                        'backgroundColor' => 'transparent',
                        'textAlign' => 'left',
                    ],
                    'zIndex' => 10,
                    'animation' => ['type' => 'none', 'duration' => 500, 'delay' => 0, 'easing' => 'ease'],
                ],
                [
                    'id' => 'desc-1',
                    'type' => 'text',
                    'content' => 'Giảm đến 50% cho đơn hàng đầu tiên',
                    'position' => ['x' => 24, 'y' => 110],
                    'size' => ['width' => 280, 'height' => 24],
                    'style' => [
                        'fontSize' => '14px',
                        'fontWeight' => '400',
                        'color' => 'rgba(255,255,255,0.8)',
                        'backgroundColor' => 'transparent',
                        'textAlign' => 'left',
                    ],
                    'zIndex' => 10,
                    'animation' => ['type' => 'none', 'duration' => 500, 'delay' => 0, 'easing' => 'ease'],
                ],
            ],
            'url' => '/khuyen-mai',
            'target' => '_self',
            'order' => 1,
            'publish' => '2',
            'start_date' => now(),
            'end_date' => $endDate,
            'user_id' => 1,
        ]);

        $this->command->info('- Banner promotion-deal-hot created');
    }

    /**
     * Tạo widget Sản phẩm nổi bật
     */
    protected function createFeaturedProductsWidget(): void
    {
        $productIds = $this->getRandomProductIds(12);

        Widget::updateOrCreate(
            ['keyword' => 'featured-products'],
            [
                'name' => 'Sản phẩm nổi bật',
                'keyword' => 'featured-products',
                'short_code' => '[widget keyword="featured-products"]',
                'description' => 'Các sản phẩm nổi bật được chọn lọc',
                'model' => 'App\\Models\\Product',
                'model_id' => $productIds,
                'options' => [
                    '_global' => [
                        'items_limit' => 12,
                        'auto_promotion' => false,
                    ]
                ],
                'publish' => '2',
            ]
        );

        $this->command->info('- Widget featured-products created');
    }

    /**
     * Tạo widget Bán chạy nhất
     */
    protected function createTopSellingWidget(): void
    {
        $productIds = $this->getRandomProductIds(12);

        Widget::updateOrCreate(
            ['keyword' => 'top-selling'],
            [
                'name' => 'Bán chạy nhất',
                'keyword' => 'top-selling',
                'short_code' => '[widget keyword="top-selling"]',
                'description' => 'Các sản phẩm bán chạy nhất',
                'model' => 'App\\Models\\Product',
                'model_id' => $productIds,
                'options' => [
                    '_global' => [
                        'items_limit' => 12,
                        'auto_promotion' => false,
                    ]
                ],
                'publish' => '2',
            ]
        );

        $this->command->info('- Widget top-selling created');
    }

    /**
     * Tạo widget Đang giảm giá
     */
    protected function createOnSaleProductsWidget(): void
    {
        $productIds = $this->getRandomProductIds(12);

        Widget::updateOrCreate(
            ['keyword' => 'on-sale-products'],
            [
                'name' => 'Đang giảm giá',
                'keyword' => 'on-sale-products',
                'short_code' => '[widget keyword="on-sale-products"]',
                'description' => 'Các sản phẩm đang có khuyến mãi',
                'model' => 'App\\Models\\Product',
                'model_id' => $productIds,
                'options' => [
                    '_global' => [
                        'items_limit' => 12,
                        'auto_promotion' => true, // Lấy sản phẩm có promotion
                    ]
                ],
                'publish' => '2',
            ]
        );

        $this->command->info('- Widget on-sale-products created');
    }

    /**
     * Tạo widget Deal tuần này
     */
    protected function createDealOfTheWeekWidget(): void
    {
        $productIds = $this->getRandomProductIds(1);

        Widget::updateOrCreate(
            ['keyword' => 'deal-of-the-week'],
            [
                'name' => 'Deal tuần này',
                'keyword' => 'deal-of-the-week',
                'short_code' => '[widget keyword="deal-of-the-week"]',
                'description' => 'Sản phẩm deal hot trong tuần',
                'model' => 'App\\Models\\Product',
                'model_id' => $productIds,
                'options' => [
                    '_global' => [
                        'items_limit' => 1,
                        'auto_promotion' => false,
                        'countdown_days' => 7,
                    ]
                ],
                'publish' => '2',
            ]
        );

        $this->command->info('- Widget deal-of-the-week created');
    }

    /**
     * Lấy ngẫu nhiên product IDs
     */
    protected function getRandomProductIds(int $count): array
    {
        return Product::where('publish', '2')
            ->inRandomOrder()
            ->take($count)
            ->pluck('id')
            ->toArray();
    }
}
