<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RenameCategoryToFoodSeeder extends Seeder
{
    /**
     * Rename categories to food types like MarketPro template
     */
    public function run(): void
    {
        $foodNames = [
            'Sữa & Trứng',
            'Đồ Ăn Vặt',
            'Thực Phẩm Đông Lạnh',
            'Rau Củ Quả',
            'Cá & Thịt',
            'Bánh Ngọt',
            'Đồ Uống & Nước Ép',
            'Thức Ăn Thú Cưng',
            'Trái Cây Tươi',
            'Kẹo & Socola',
            'Gia Vị & Nước Chấm',
            'Mì & Bún Phở',
            'Bánh Mì & Ngũ Cốc',
            'Đồ Hộp',
            'Hải Sản',
            'Thịt Bò',
            'Thịt Gà',
            'Thịt Heo',
            'Rau Xanh',
            'Củ Quả',
        ];

        $foodCanonicals = [
            'sua-trung',
            'do-an-vat',
            'thuc-pham-dong-lanh',
            'rau-cu-qua',
            'ca-thit',
            'banh-ngot',
            'do-uong-nuoc-ep',
            'thuc-an-thu-cung',
            'trai-cay-tuoi',
            'keo-socola',
            'gia-vi-nuoc-cham',
            'mi-bun-pho',
            'banh-mi-ngu-coc',
            'do-hop',
            'hai-san',
            'thit-bo',
            'thit-ga',
            'thit-heo',
            'rau-xanh',
            'cu-qua',
        ];

        // Get all category language records
        $records = DB::table('product_catalogue_language')
            ->where('language_id', 1)
            ->orderBy('product_catalogue_id')
            ->limit(20)
            ->get();

        foreach ($records as $index => $record) {
            if (isset($foodNames[$index])) {
                DB::table('product_catalogue_language')
                    ->where('product_catalogue_id', $record->product_catalogue_id)
                    ->where('language_id', 1)
                    ->update([
                        'name' => $foodNames[$index],
                        'canonical' => $foodCanonicals[$index],
                    ]);
            }
        }

        $this->command->info('Đã đổi tên ' . count($records) . ' danh mục sang dạng thực phẩm!');
    }
}
