<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Menu;
use App\Models\MenuItem;

class MenuSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Xóa menu cũ (nếu có) để tránh trùng lặp
        DB::table('menus')->where('code', 'main-menu')->delete();

        // 1. Tạo Menu
        $menuId = DB::table('menus')->insertGetId([
            'name' => 'Main Menu',
            'code' => 'main-menu',
            'position' => 'header',
            'description' => 'Menu chính của website',
            'user_id' => 1, // Giả sử user admin đầu tiên id = 1
            'publish' => '2',
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Cấu trúc Menu Items
        $menuItems = [
            ['name' => 'Trang chủ', 'url' => '/', 'parent_id' => null, 'order' => 1],
            ['name' => 'Sản phẩm', 'url' => 'san-pham', 'parent_id' => null, 'order' => 2],
            ['name' => 'Giới thiệu', 'url' => 'gioi-thieu', 'parent_id' => null, 'order' => 3],
            ['name' => 'Tin tức', 'url' => 'tin-tuc', 'parent_id' => null, 'order' => 4],
            ['name' => 'Hình Ảnh', 'url' => 'hinh-anh', 'parent_id' => null, 'order' => 5],
            ['name' => 'Video', 'url' => 'video', 'parent_id' => null, 'order' => 6],
            ['name' => 'Hướng Dẫn', 'url' => 'huong-dan', 'parent_id' => null, 'order' => 7],
            ['name' => 'Liên Hệ', 'url' => 'lien-he', 'parent_id' => null, 'order' => 8],
        ];

        // Lấy language_id mặc định (1)
        $languageId = 1;

        foreach ($menuItems as $itemData) {
            $parentUrl = $itemData['url'];
            // Insert MenuItem
            $itemId = DB::table('menu_items')->insertGetId([
                'menu_id' => $menuId,
                'parent_id' => $itemData['parent_id'],
                'name' => $itemData['name'],
                'url' => rtrim($parentUrl, '.html'), // Frontend xử lý canonical -> Url, append .html
                'publish' => '2',
                'order' => $itemData['order'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Insert MenuItemLanguage
            DB::table('menu_item_languages')->insert([
                'menu_item_id' => $itemId,
                'language_id' => $languageId,
                'name' => $itemData['name'],
                'url' => rtrim($parentUrl, '.html'),
                'canonical' => rtrim($parentUrl, '.html'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Nếu là Danh mục "Sản phẩm", tạo thêm danh mục con
            if ($itemData['name'] === 'Sản phẩm') {
                $subItems = [
                    ['name' => 'Thời trang nam', 'url' => 'thoi-trang-nam', 'order' => 1],
                    ['name' => 'Thời trang nữ', 'url' => 'thoi-trang-nu', 'order' => 2],
                ];

                foreach ($subItems as $subItem) {
                    $subItemId = DB::table('menu_items')->insertGetId([
                        'menu_id' => $menuId,
                        'parent_id' => $itemId,
                        'name' => $subItem['name'],
                        'url' => $subItem['url'],
                        'publish' => '2',
                        'order' => $subItem['order'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('menu_item_languages')->insert([
                        'menu_item_id' => $subItemId,
                        'language_id' => $languageId,
                        'name' => $subItem['name'],
                        'url' => $subItem['url'],
                        'canonical' => $subItem['url'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }
}
