<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductCatalogue;
use App\Models\Language;
use App\Models\Router;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Classes\NestedSet;

class ProductCatalogueSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::first();
        if (!$user) {
            $user = User::create([
                'name' => 'Admin',
                'email' => 'admin@example.com',
                'password' => bcrypt('password'),
            ]);
        }

        $language = Language::where('canonical', config('app.locale', 'vi'))->first();
        if (!$language) {
            $language = Language::first();
        }
        if (!$language) {
            $language = Language::create([
                'name' => 'Tiếng Việt',
                'canonical' => 'vi',
                'image' => 'vi.png',
                'description' => 'Ngôn ngữ Tiếng Việt',
                'publish' => 1,
                'user_id' => $user->id,
            ]);
            $this->command->info('Created default language: ' . $language->name);
        }

        config(['app.language_id' => $language->id]);

        $categories = [
            // Level 1 - Danh mục cha chính
            ['name' => 'Sản Phẩm', 'parent_id' => null, 'description' => 'Tất cả sản phẩm'],

            // Level 2 - Các danh mục con thuộc "Sản Phẩm"
            ['name' => 'Thời Trang Nữ', 'parent_id' => 1, 'description' => 'Thời trang dành cho nữ'],
            ['name' => 'Mẹ & Bé', 'parent_id' => 1, 'description' => 'Sản phẩm cho mẹ và bé'],
            ['name' => 'Nhà Cửa & Đời Sống', 'parent_id' => 1, 'description' => 'Đồ dùng gia đình và đời sống'],
            ['name' => 'Sắc Đẹp', 'parent_id' => 1, 'description' => 'Mỹ phẩm và làm đẹp'],
            ['name' => 'Sức Khỏe', 'parent_id' => 1, 'description' => 'Chăm sóc sức khỏe'],
            ['name' => 'Giày Dép Nữ', 'parent_id' => 1, 'description' => 'Giày dép thời trang nữ'],
            ['name' => 'Túi Ví Nữ', 'parent_id' => 1, 'description' => 'Túi xách và ví nữ'],
            ['name' => 'Phụ Kiện & Trang Sức Nữ', 'parent_id' => 1, 'description' => 'Phụ kiện và trang sức thời trang nữ'],
            ['name' => 'Bách Hóa Online', 'parent_id' => 1, 'description' => 'Siêu thị trực tuyến'],
            ['name' => 'Nhà Sách Online', 'parent_id' => 1, 'description' => 'Sách và văn phòng phẩm'],
            ['name' => 'Máy Ảnh & Máy Quay Phim', 'parent_id' => 1, 'description' => 'Thiết bị nhiếp ảnh và quay phim'],
            ['name' => 'Đồng Hồ', 'parent_id' => 1, 'description' => 'Đồng hồ đeo tay'],
            ['name' => 'Giày Dép Nam', 'parent_id' => 1, 'description' => 'Giày dép thời trang nam'],
            ['name' => 'Thiết Bị Điện Gia Dụng', 'parent_id' => 1, 'description' => 'Máy móc điện tử gia đình'],
            ['name' => 'Thể Thao & Du Lịch', 'parent_id' => 1, 'description' => 'Đồ thể thao và du lịch'],
            ['name' => 'Ô Tô & Xe Máy & Xe Đạp', 'parent_id' => 1, 'description' => 'Phương tiện giao thông và phụ kiện'],
        ];

        $insertedIds = [];
        $parentMap = [null => 0];

        foreach ($categories as $index => $category) {
            $parentId = $category['parent_id'] ? ($parentMap[$category['parent_id']] ?? 0) : 0;

            $productCatalogue = ProductCatalogue::create([
                'parent_id' => $parentId,
                'user_id' => $user->id,
                'publish' => 2,
                'type' => 'default',
                'order' => $index + 1,
            ]);

            $insertedIds[] = $productCatalogue->id;
            $parentMap[$index + 1] = $productCatalogue->id;

            $canonical = Str::slug($category['name']);

            // Kiểm tra canonical đã tồn tại chưa
            $baseCanonical = $canonical;
            $counter = 1;
            while (DB::table('product_catalogue_language')->where('canonical', $canonical)->exists()) {
                $canonical = $baseCanonical . '-' . $counter;
                $counter++;
            }

            DB::table('product_catalogue_language')->updateOrInsert(
                [
                    'product_catalogue_id' => $productCatalogue->id,
                    'language_id' => $language->id,
                ],
                [
                    'name' => $category['name'],
                    'canonical' => $canonical,
                    'description' => $category['description'],
                    'content' => $category['description'],
                    'meta_title' => $category['name'] . ' - Cửa hàng',
                    'meta_keyword' => $category['name'] . ', sản phẩm',
                    'meta_description' => $category['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $routerableType = get_class($productCatalogue);
            Router::updateOrCreate(
                [
                    'module' => 'product_catalogues',
                    'routerable_id' => $productCatalogue->id,
                ],
                [
                    'canonical' => $canonical,
                    'routerable_type' => $routerableType,
                    'next_component' => 'ProductCataloguePage',
                    'controller' => 'App\Http\Controllers\Frontend\Product\ProductCatalogueController',
                    'language_id' => $language->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info('Created ' . count($categories) . ' product catalogues');

        $this->runNestedSet();

        $this->command->info('NestedSet calculated successfully!');
    }

    private function runNestedSet()
    {
        $nestedset = new NestedSet([
            'table' => 'product_catalogues',
            'foreigKey' => 'product_catalogue_id',
            'pivotTable' => 'product_catalogue_language'
        ]);

        $nestedset->get();
        $nestedset->recursive(0, $nestedset->set());
        $nestedset->action();
    }
}
