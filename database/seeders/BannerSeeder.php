<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Banner;

class BannerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $banners = [
            [
                'name' => 'Main Slide',
                'code' => 'main-slide',
                'description' => 'Slider chính to nhất ở đầu website',
            ],
            [
                'name' => 'Home Banner',
                'code' => 'home-banner',
                'description' => 'Các banner nhỏ hiển thị xen kẽ trên trang chủ',
            ],
            [
                'name' => 'Daily Banner',
                'code' => 'daily-banner',
                'description' => 'Banner dành cho khu vực sản phẩm Daily Best Sells',
            ],
            [
                'name' => 'Promotion Deal Hot',
                'code' => 'promotion-deal-hot',
                'description' => 'Banner quảng cáo cạnh danh sách sản phẩm Hot Deals',
            ]
        ];

        foreach ($banners as $bannerData) {
            // Delete if exists
            DB::table('banners')->where('code', $bannerData['code'])->delete();

            // Insert
            DB::table('banners')->insert([
                'name' => $bannerData['name'],
                'code' => $bannerData['code'],
                'description' => $bannerData['description'],
                'publish' => '2',
                'user_id' => 1,
                'order' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
