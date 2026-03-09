<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductCatalogue;
use Illuminate\Support\Facades\DB;

class UpdateProductCatalogueImagesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Cập nhật hình ảnh cho các danh mục sản phẩm từ thư mục category-thumb
     */
    public function run(): void
    {
        // Mapping tên danh mục với tên file hình ảnh
        $imageMapping = [
            // Các danh mục đã tồn tại trước đó
            'Thời trang nam' => 'userfiles/image/category-thumb/thoi-trang-nam.webp',
            'Điện thoại & Phụ Kiện' => 'userfiles/image/category-thumb/dien-thoai-phu-kien.webp',
            'Thiết bị điện tử' => 'userfiles/image/category-thumb/thiet-bi-dien-tu.webp',
            'Máy tính & Laptop' => 'userfiles/image/category-thumb/may-tinh-lap-top.webp',

            // Các danh mục mới vừa tạo
            'Thời Trang Nữ' => 'userfiles/image/category-thumb/thoi-trang-nu.webp',
            'Mẹ & Bé' => 'userfiles/image/category-thumb/me-be.webp',
            'Nhà Cửa & Đời Sống' => 'userfiles/image/category-thumb/nha-cua-doi-song.webp',
            'Sắc Đẹp' => 'userfiles/image/category-thumb/sac-dep.webp',
            'Sức Khỏe' => 'userfiles/image/category-thumb/suc-khoe.webp',
            'Giày Dép Nữ' => 'userfiles/image/category-thumb/giay-dep-nu.webp',
            'Túi Ví Nữ' => 'userfiles/image/category-thumb/tui-vi-nu.webp',
            'Phụ Kiện & Trang Sức Nữ' => 'userfiles/image/category-thumb/phu-kien-trang-thuc.webp',
            'Bách Hóa Online' => 'userfiles/image/category-thumb/bach-hoa-online.webp',
            'Nhà Sách Online' => 'userfiles/image/category-thumb/nha-sach-online.webp',
            'Máy Ảnh & Máy Quay Phim' => 'userfiles/image/category-thumb/may-anh.webp',
            'Đồng Hồ' => 'userfiles/image/category-thumb/dong-ho.webp',
            'Giày Dép Nam' => 'userfiles/image/category-thumb/giay-dep.webp',
            'Thiết Bị Điện Gia Dụng' => 'userfiles/image/category-thumb/thiet-bi-gia-dung.webp',
            'Thể Thao & Du Lịch' => 'userfiles/image/category-thumb/the-thao-du-lich.webp',
            'Ô Tô & Xe Máy & Xe Đạp' => 'userfiles/image/category-thumb/o-to-xe-may.webp',
        ];

        $updatedCount = 0;
        $notFoundCount = 0;

        foreach ($imageMapping as $categoryName => $imagePath) {
            // Tìm danh mục theo tên trong bảng product_catalogue_language
            $catalogue = ProductCatalogue::whereHas('languages', function ($query) use ($categoryName) {
                $query->where('product_catalogue_language.language_id', 1)
                    ->where('product_catalogue_language.name', $categoryName);
            })->first();

            if ($catalogue) {
                // Cập nhật hình ảnh
                $catalogue->update([
                    'image' => $imagePath,
                ]);

                $this->command->info("✓ Updated image for: {$categoryName} (ID: {$catalogue->id})");
                $updatedCount++;
            } else {
                $this->command->warn("✗ Category not found: {$categoryName}");
                $notFoundCount++;
            }
        }

        $this->command->info("\n=== Summary ===");
        $this->command->info("Total categories processed: " . count($imageMapping));
        $this->command->info("Successfully updated: {$updatedCount}");
        if ($notFoundCount > 0) {
            $this->command->warn("Not found: {$notFoundCount}");
        }
    }
}
