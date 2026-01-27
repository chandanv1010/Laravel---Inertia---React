<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PromotionalBannerElementsSeeder extends Seeder
{
    /**
     * Add elements to promo-countdown slides
     * 
     * Run: php artisan db:seed --class=PromotionalBannerElementsSeeder
     */
    public function run(): void
    {
        // Elements for Slide 1: Pasta Ý Nhập Khẩu
        $slide1Elements = [
            // Title text
            [
                'id' => 'el-pasta-title',
                'type' => 'text',
                'content' => 'Pasta Ý Nhập Khẩu',
                'position' => ['x' => 30, 'y' => 30],
                'size' => ['width' => 350, 'height' => 40],
                'style' => [
                    'fontSize' => '24px',
                    'fontWeight' => 'bold',
                    'color' => '#121535',
                    'backgroundColor' => 'transparent',
                ],
                'zIndex' => 10,
            ],
            // Subtitle text
            [
                'id' => 'el-pasta-subtitle',
                'type' => 'text',
                'content' => 'Thời gian còn lại của khuyến mãi.',
                'position' => ['x' => 30, 'y' => 80],
                'size' => ['width' => 300, 'height' => 25],
                'style' => [
                    'fontSize' => '14px',
                    'fontWeight' => 'normal',
                    'color' => '#6b7280',
                    'backgroundColor' => 'transparent',
                ],
                'zIndex' => 10,
            ],
            // Countdown
            [
                'id' => 'el-pasta-countdown',
                'type' => 'countdown',
                'content' => '',
                'position' => ['x' => 30, 'y' => 120],
                'size' => ['width' => 280, 'height' => 40],
                'style' => [
                    'backgroundColor' => '#1c799b',
                    'color' => '#ffffff',
                ],
                'zIndex' => 10,
                'countdownDuration' => 2592000, // 30 days in seconds
            ],
            // Button
            [
                'id' => 'el-pasta-button',
                'type' => 'button',
                'content' => 'Mua Ngay',
                'url' => '/khuyen-mai',
                'target' => '_self',
                'position' => ['x' => 30, 'y' => 180],
                'size' => ['width' => 130, 'height' => 40],
                'style' => [
                    'fontSize' => '14px',
                    'fontWeight' => '500',
                    'color' => '#ffffff',
                    'backgroundColor' => '#1c799b',
                    'borderRadius' => '20px',
                    'textAlign' => 'center',
                ],
                'zIndex' => 10,
            ],
        ];

        // Elements for Slide 2: Combo Rau Củ Tươi
        $slide2Elements = [
            // Title text
            [
                'id' => 'el-combo-title',
                'type' => 'text',
                'content' => 'Combo Rau Củ Tươi',
                'position' => ['x' => 30, 'y' => 30],
                'size' => ['width' => 350, 'height' => 40],
                'style' => [
                    'fontSize' => '24px',
                    'fontWeight' => 'bold',
                    'color' => '#121535',
                    'backgroundColor' => 'transparent',
                ],
                'zIndex' => 10,
            ],
            // Subtitle text
            [
                'id' => 'el-combo-subtitle',
                'type' => 'text',
                'content' => 'Thời gian còn lại của khuyến mãi.',
                'position' => ['x' => 30, 'y' => 80],
                'size' => ['width' => 300, 'height' => 25],
                'style' => [
                    'fontSize' => '14px',
                    'fontWeight' => 'normal',
                    'color' => '#6b7280',
                    'backgroundColor' => 'transparent',
                ],
                'zIndex' => 10,
            ],
            // Countdown
            [
                'id' => 'el-combo-countdown',
                'type' => 'countdown',
                'content' => '',
                'position' => ['x' => 30, 'y' => 120],
                'size' => ['width' => 280, 'height' => 40],
                'style' => [
                    'backgroundColor' => '#1c799b',
                    'color' => '#ffffff',
                ],
                'zIndex' => 10,
                'countdownDuration' => 2160000, // 25 days in seconds
            ],
            // Button
            [
                'id' => 'el-combo-button',
                'type' => 'button',
                'content' => 'Mua Ngay',
                'url' => '/khuyen-mai',
                'target' => '_self',
                'position' => ['x' => 30, 'y' => 180],
                'size' => ['width' => 130, 'height' => 40],
                'style' => [
                    'fontSize' => '14px',
                    'fontWeight' => '500',
                    'color' => '#ffffff',
                    'backgroundColor' => '#1c799b',
                    'borderRadius' => '20px',
                    'textAlign' => 'center',
                ],
                'zIndex' => 10,
            ],
        ];

        // Update Slide 1 (ID 23)
        $updated1 = DB::table('slides')->where('id', 23)->update([
            'elements' => json_encode($slide1Elements),
            'updated_at' => now(),
        ]);
        echo "Slide 1 (ID 23) updated: " . ($updated1 ? 'Yes' : 'No') . "\n";
        echo "Elements added: " . count($slide1Elements) . "\n";

        // Update Slide 2 (ID 24)
        $updated2 = DB::table('slides')->where('id', 24)->update([
            'elements' => json_encode($slide2Elements),
            'updated_at' => now(),
        ]);
        echo "Slide 2 (ID 24) updated: " . ($updated2 ? 'Yes' : 'No') . "\n";
        echo "Elements added: " . count($slide2Elements) . "\n";

        echo "\n✅ Promotional banner elements seeded successfully!\n";
        echo "Refresh the banner editor at /backend/banner/4/edit to see elements.\n";
        echo "Refresh homepage to see countdown banners with real data.\n";
    }
}
