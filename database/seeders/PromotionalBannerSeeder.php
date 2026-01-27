<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PromotionalBannerSeeder extends Seeder
{
    /**
     * Create promotional countdown banners
     * 
     * Run this seeder: php artisan db:seed --class=PromotionalBannerSeeder
     */
    public function run(): void
    {
        $userId = DB::table('users')->where('email', config('grant_perms_email', 'chandanv1010@gmail.com'))->value('id') ?? 1;
        
        // Create the banner group for promo countdown
        $bannerId = DB::table('banners')->insertGetId([
            'name' => 'Promo Countdown Banners',
            'code' => 'promo-countdown',
            'description' => 'Promotional banners with countdown timers displayed below Flash Sale section',
            'position' => 'home-promo',
            'width' => 1200,
            'height' => 220,
            'publish' => '2',
            'user_id' => $userId,
            'order' => 10,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        echo "Created banner with ID: {$bannerId}\n";

        // Slide 1: Pasta Ý Nhập Khẩu
        $slide1Id = DB::table('slides')->insertGetId([
            'banner_id' => $bannerId,
            'name' => 'Pasta Ý Nhập Khẩu',
            'background_image' => '/userfiles/image/banner-2/flash-sale-bg1.png',
            'background_color' => '#f8f9fa',
            'elements' => json_encode([]),
            'url' => '/khuyen-mai',
            'target' => '_self',
            'order' => 1,
            'publish' => '2',
            'start_date' => now(),
            'end_date' => now()->addDays(30), // 30 days countdown
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        echo "Created slide 1 with ID: {$slide1Id} - End date: " . now()->addDays(30)->toDateTimeString() . "\n";

        // Slide 2: Combo Rau Củ Tươi
        $slide2Id = DB::table('slides')->insertGetId([
            'banner_id' => $bannerId,
            'name' => 'Combo Rau Củ Tươi',
            'background_image' => '/userfiles/image/banner-2/flash-sale-bg2.png',
            'background_color' => '#fef9f3',
            'elements' => json_encode([]),
            'url' => '/khuyen-mai',
            'target' => '_self',
            'order' => 2,
            'publish' => '2',
            'start_date' => now(),
            'end_date' => now()->addDays(25), // 25 days countdown
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        echo "Created slide 2 with ID: {$slide2Id} - End date: " . now()->addDays(25)->toDateTimeString() . "\n";

        echo "\n✅ Promotional countdown banners created successfully!\n";
        echo "Banner code: promo-countdown\n";
        echo "Access banner management at: /backend/banner/{$bannerId}/edit\n";
    }
}
