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

class AddProductCataloguesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder ADDS new categories without deleting existing ones.
     */
    public function run(): void
    {
        $user = User::first();
        if (!$user) {
            $this->command->error('No user found. Please create a user first.');
            return;
        }

        $language = Language::where('id', 1)->first();
        if (!$language) {
            $this->command->error('Language with ID 1 not found. Please check your languages table.');
            return;
        }

        config(['app.language_id' => $language->id]);

        // Tìm danh mục "Sản Phẩm" làm parent
        $parentCatalogue = ProductCatalogue::whereHas('languages', function ($query) {
            $query->where('product_catalogue_language.language_id', 1)
                ->where('product_catalogue_language.name', 'Sản Phẩm');
        })->first();

        if (!$parentCatalogue) {
            // Nếu chưa có danh mục "Sản Phẩm", tạo mới
            $this->command->info('Creating parent category "Sản Phẩm"...');
            $parentCatalogue = ProductCatalogue::create([
                'parent_id' => 0,
                'user_id' => $user->id,
                'publish' => 2,
                'type' => 'default',
                'order' => 0,
            ]);

            $canonical = 'san-pham';
            $counter = 1;
            while (DB::table('product_catalogue_language')->where('canonical', $canonical)->exists()) {
                $canonical = 'san-pham-' . $counter;
                $counter++;
            }

            DB::table('product_catalogue_language')->insert([
                'product_catalogue_id' => $parentCatalogue->id,
                'language_id' => $language->id,
                'name' => 'Sản Phẩm',
                'canonical' => $canonical,
                'description' => 'Tất cả sản phẩm',
                'content' => 'Tất cả sản phẩm',
                'meta_title' => 'Sản Phẩm - Cửa hàng',
                'meta_keyword' => 'Sản Phẩm, sản phẩm',
                'meta_description' => 'Tất cả sản phẩm',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $routerableType = get_class($parentCatalogue);
            Router::updateOrCreate(
                [
                    'module' => 'product_catalogues',
                    'routerable_id' => $parentCatalogue->id,
                ],
                [
                    'canonical' => $canonical,
                    'routerable_type' => $routerableType,
                    'next_component' => 'ProductCataloguePage',
                    'controller' => 'App\\Http\\Controllers\\Frontend\\Product\\ProductCatalogueController',
                    'language_id' => $language->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info('Parent category "Sản Phẩm" ID: ' . $parentCatalogue->id);

        // Các danh mục con - Tất cả đều là con của "Sản Phẩm"
        $categories = [
            ['name' => 'Thời Trang Nữ', 'description' => 'Thời trang dành cho nữ'],
            ['name' => 'Mẹ & Bé', 'description' => 'Sản phẩm cho mẹ và bé'],
            ['name' => 'Nhà Cửa & Đời Sống', 'description' => 'Đồ dùng gia đình và đời sống'],
            ['name' => 'Sắc Đẹp', 'description' => 'Mỹ phẩm và làm đẹp'],
            ['name' => 'Sức Khỏe', 'description' => 'Chăm sóc sức khỏe'],
            ['name' => 'Giày Dép Nữ', 'description' => 'Giày dép thời trang nữ'],
            ['name' => 'Túi Ví Nữ', 'description' => 'Túi xách và ví nữ'],
            ['name' => 'Phụ Kiện & Trang Sức Nữ', 'description' => 'Phụ kiện và trang sức thời trang nữ'],
            ['name' => 'Bách Hóa Online', 'description' => 'Siêu thị trực tuyến'],
            ['name' => 'Nhà Sách Online', 'description' => 'Sách và văn phòng phẩm'],
            ['name' => 'Máy Ảnh & Máy Quay Phim', 'description' => 'Thiết bị nhiếp ảnh và quay phim'],
            ['name' => 'Đồng Hồ', 'description' => 'Đồng hồ đeo tay'],
            ['name' => 'Giày Dép Nam', 'description' => 'Giày dép thời trang nam'],
            ['name' => 'Thiết Bị Điện Gia Dụng', 'description' => 'Máy móc điện tử gia đình'],
            ['name' => 'Thể Thao & Du Lịch', 'description' => 'Đồ thể thao và du lịch'],
            ['name' => 'Ô Tô & Xe Máy & Xe Đạp', 'description' => 'Phương tiện giao thông và phụ kiện'],
        ];

        $insertedIds = [];
        $currentOrder = ProductCatalogue::max('order') ?? 0;

        foreach ($categories as $index => $category) {
            // Kiểm tra xem danh mục đã tồn tại chưa
            $exists = ProductCatalogue::whereHas('languages', function ($query) use ($category) {
                $query->where('product_catalogue_language.language_id', 1)
                    ->where('product_catalogue_language.name', $category['name']);
            })->exists();

            if ($exists) {
                $this->command->warn('Category "' . $category['name'] . '" already exists. Skipping...');
                continue;
            }

            $productCatalogue = ProductCatalogue::create([
                'parent_id' => $parentCatalogue->id,
                'user_id' => $user->id,
                'publish' => 2,
                'type' => 'default',
                'order' => $currentOrder + $index + 1,
            ]);

            $insertedIds[] = $productCatalogue->id;

            $canonical = Str::slug($category['name']);

            // Kiểm tra canonical đã tồn tại chưa
            $baseCanonical = $canonical;
            $counter = 1;
            while (DB::table('product_catalogue_language')->where('canonical', $canonical)->exists()) {
                $canonical = $baseCanonical . '-' . $counter;
                $counter++;
            }

            DB::table('product_catalogue_language')->insert([
                'product_catalogue_id' => $productCatalogue->id,
                'language_id' => $language->id,
                'name' => $category['name'],
                'canonical' => $canonical,
                'description' => $category['description'],
                'content' => $category['description'],
                'meta_title' => $category['name'] . ' - Cửa hàng',
                'meta_keyword' => $category['name'] . ', sản phẩm',
                'meta_description' => $category['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

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
                    'controller' => 'App\\Http\\Controllers\\Frontend\\Product\\ProductCatalogueController',
                    'language_id' => $language->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $this->command->info('Created: ' . $category['name'] . ' (ID: ' . $productCatalogue->id . ')');
        }

        $this->command->info('Created ' . count($insertedIds) . ' new product catalogues');

        // Chạy NestedSet để cập nhật lft, rgt, level
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
