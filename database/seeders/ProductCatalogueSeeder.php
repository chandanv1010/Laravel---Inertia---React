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
            // Level 1 - Danh mục chính
            ['name' => 'Điện Thoại & Máy Tính Bảng', 'parent_id' => null, 'description' => 'Điện thoại thông minh, máy tính bảng và phụ kiện'],
            ['name' => 'Laptop & Máy Tính', 'parent_id' => null, 'description' => 'Laptop, máy tính để bàn và linh kiện'],
            ['name' => 'Điện Tử & Gia Dụng', 'parent_id' => null, 'description' => 'Thiết bị điện tử và đồ gia dụng'],
            ['name' => 'Thời Trang & Phụ Kiện', 'parent_id' => null, 'description' => 'Quần áo, giày dép và phụ kiện thời trang'],
            ['name' => 'Thực Phẩm & Đồ Uống', 'parent_id' => null, 'description' => 'Thực phẩm tươi sống và đồ uống'],
            ['name' => 'Sức Khỏe & Làm Đẹp', 'parent_id' => null, 'description' => 'Sản phẩm chăm sóc sức khỏe và làm đẹp'],
            
            // Level 2 - Điện Thoại & Máy Tính Bảng
            ['name' => 'Điện Thoại Thông Minh', 'parent_id' => 1, 'description' => 'Smartphone các hãng'],
            ['name' => 'Máy Tính Bảng', 'parent_id' => 1, 'description' => 'Tablet và iPad'],
            ['name' => 'Phụ Kiện Điện Thoại', 'parent_id' => 1, 'description' => 'Ốp lưng, sạc, tai nghe'],
            
            // Level 2 - Laptop & Máy Tính
            ['name' => 'Laptop', 'parent_id' => 2, 'description' => 'Laptop các hãng'],
            ['name' => 'Máy Tính Để Bàn', 'parent_id' => 2, 'description' => 'PC và linh kiện'],
            ['name' => 'Linh Kiện Máy Tính', 'parent_id' => 2, 'description' => 'RAM, ổ cứng, card đồ họa'],
            
            // Level 2 - Điện Tử & Gia Dụng
            ['name' => 'Tivi & Màn Hình', 'parent_id' => 3, 'description' => 'Smart TV, màn hình máy tính'],
            ['name' => 'Tủ Lạnh & Máy Lạnh', 'parent_id' => 3, 'description' => 'Thiết bị làm lạnh'],
            ['name' => 'Máy Giặt & Sấy', 'parent_id' => 3, 'description' => 'Thiết bị giặt ủi'],
            
            // Level 2 - Thời Trang & Phụ Kiện
            ['name' => 'Quần Áo Nam', 'parent_id' => 4, 'description' => 'Thời trang nam giới'],
            ['name' => 'Quần Áo Nữ', 'parent_id' => 4, 'description' => 'Thời trang nữ giới'],
            ['name' => 'Giày Dép', 'parent_id' => 4, 'description' => 'Giày dép nam nữ'],
            
            // Level 2 - Thực Phẩm & Đồ Uống
            ['name' => 'Thực Phẩm Tươi Sống', 'parent_id' => 5, 'description' => 'Rau củ, thịt cá tươi'],
            ['name' => 'Đồ Uống', 'parent_id' => 5, 'description' => 'Nước uống, đồ uống có gas'],
            ['name' => 'Đồ Khô & Đóng Hộp', 'parent_id' => 5, 'description' => 'Thực phẩm đóng hộp, đồ khô'],
            
            // Level 2 - Sức Khỏe & Làm Đẹp
            ['name' => 'Mỹ Phẩm', 'parent_id' => 6, 'description' => 'Kem dưỡng, son môi, phấn'],
            ['name' => 'Chăm Sóc Da', 'parent_id' => 6, 'description' => 'Sản phẩm chăm sóc da mặt'],
            ['name' => 'Thực Phẩm Chức Năng', 'parent_id' => 6, 'description' => 'Vitamin, thực phẩm bổ sung'],
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
