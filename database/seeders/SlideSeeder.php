<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Banner;

class SlideSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lấy danh sách ID Banner
        $mainSlide = Banner::where('code', 'main-slide')->first();
        $homeBanner = Banner::where('code', 'home-banner')->first();
        $dailyBanner = Banner::where('code', 'daily-banner')->first();
        $promotionDealHot = Banner::where('code', 'promotion-deal-hot')->first();

        // Xóa slides cũ để tránh trùng lặp
        DB::table('slides')->truncate();

        // 1. Main Slide (Slide chính to nhất)
        if ($mainSlide) {
            $slides = [
                [
                    'banner_id' => $mainSlide->id,
                    'name' => 'Khuyến mãi đặc biệt mùa hè',
                    'background_image' => 'https://marketpro.template.wowtheme7.com/assets/images/bg/banner-bg1.png', // Or use placehold.co/1200x500
                    'url' => '/san-pham.html',
                    'order' => 1,
                    'publish' => '2',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'banner_id' => $mainSlide->id,
                    'name' => 'Bộ sưu tập mới nhất',
                    'background_image' => 'https://marketpro.template.wowtheme7.com/assets/images/bg/banner-bg2.png',
                    'url' => '/san-pham.html',
                    'order' => 2,
                    'publish' => '2',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            ];
            DB::table('slides')->insert($slides);
        }

        // 2. Home Banner (4 banner nhỏ xếp thành dòng, chia aspect 370x215)
        if ($homeBanner) {
            $homeSlides = [];
            for ($i = 1; $i <= 4; $i++) {
                $homeSlides[] = [
                    'banner_id' => $homeBanner->id,
                    'name' => 'Home Banner Small ' . $i,
                    'background_image' => '/userfiles/image/banner/promotional-banner-img' . $i . '.png',
                    'url' => '/san-pham.html',
                    'order' => $i,
                    'publish' => '2',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            DB::table('slides')->insert($homeSlides);
        }

        // 3. Daily Banner (Khu Daily Best Sells - Banner dọc)
        if ($dailyBanner) {
            DB::table('slides')->insert([
                [
                    'banner_id' => $dailyBanner->id,
                    'name' => 'Daily Best Sells Banner',
                    'background_image' => 'https://placehold.co/370x500',
                    'url' => '/san-pham.html',
                    'order' => 1,
                    'publish' => '2',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            ]);
        }

        // 4. Promotion Deal Hot (Khu Hot Deals)
        if ($promotionDealHot) {
            DB::table('slides')->insert([
                [
                    'banner_id' => $promotionDealHot->id,
                    'name' => 'Promotion Deal Hot Banner',
                    'background_image' => 'https://placehold.co/400x400',
                    'url' => '/san-pham.html',
                    'order' => 1,
                    'publish' => '2',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            ]);
        }
    }
}
