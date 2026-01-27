<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UpdateCategoryImagesSeeder extends Seeder
{
    /**
     * Update category images to use user-uploaded transparent PNGs
     */
    public function run(): void
    {
        // Map category names to image files in userfiles/image/cat
        $imageMap = [
            'Sữa & Trứng' => '/userfiles/image/cat/feature-img1.png',
            'Đồ Ăn Vặt' => '/userfiles/image/cat/feature-img2.png',
            'Thực Phẩm Đông Lạnh' => '/userfiles/image/cat/feature-img3.png',
            'Rau Củ Quả' => '/userfiles/image/cat/feature-img4.png',
            'Cá & Thịt' => '/userfiles/image/cat/feature-img5.png',
            'Bánh Ngọt' => '/userfiles/image/cat/feature-img6.png',
            'Đồ Uống & Nước Ép' => '/userfiles/image/cat/feature-img7.png',
            'Thức Ăn Thú Cưng' => '/userfiles/image/cat/feature-img8.png',
            'Trái Cây Tươi' => '/userfiles/image/cat/feature-img9.png',
            'Kẹo & Socola' => '/userfiles/image/cat/feature-img10.png',
            'Gia Vị & Nước Chấm' => '/userfiles/image/cat/feature-img1.png',
            'Mì & Bún Phở' => '/userfiles/image/cat/feature-img2.png',
            'Bánh Mì & Ngũ Cốc' => '/userfiles/image/cat/feature-img3.png',
            'Đồ Hộp' => '/userfiles/image/cat/feature-img4.png',
            'Hải Sản' => '/userfiles/image/cat/feature-img5.png',
            'Thịt Bò' => '/userfiles/image/cat/feature-img6.png',
            'Thịt Gà' => '/userfiles/image/cat/feature-img7.png',
            'Thịt Heo' => '/userfiles/image/cat/feature-img8.png',
            'Rau Xanh' => '/userfiles/image/cat/feature-img9.png',
            'Củ Quả' => '/userfiles/image/cat/feature-img10.png',
        ];

        $updated = 0;

        foreach ($imageMap as $name => $imagePath) {
            $langRecord = DB::table('product_catalogue_language')
                ->where('name', $name)
                ->where('language_id', 1)
                ->first();

            if ($langRecord) {
                DB::table('product_catalogues')
                    ->where('id', $langRecord->product_catalogue_id)
                    ->update(['image' => $imagePath]);
                $updated++;
            }
        }

        $this->command->info("Đã cập nhật hình ảnh cho {$updated} danh mục!");
    }
}
