<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Widget;

class WidgetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $widgets = [
            [
                'name' => 'Category Slider',
                'keyword' => 'category',
                'description' => 'Danh sách danh mục sản phẩm ở đầu trang',
                'model' => 'App\\Models\\ProductCatalogue',
            ],
            [
                'name' => 'Hot Deals',
                'keyword' => 'hot-deals',
                'description' => 'Sản phẩm đang giảm giá sốc',
                'model' => 'App\\Models\\Product',
            ],
            [
                'name' => 'Top Selling',
                'keyword' => 'top-selling',
                'description' => 'Sản phẩm bán chạy nhất',
                'model' => 'App\\Models\\Product',
            ],
            [
                'name' => 'Featured Products',
                'keyword' => 'featured-products',
                'description' => 'Danh sách sản phẩm nổi bật',
                'model' => 'App\\Models\\Product',
            ],
            [
                'name' => 'On Sale Products',
                'keyword' => 'on-sale-products',
                'description' => 'Danh sách các sản phẩm đang có Sale',
                'model' => 'App\\Models\\Product',
            ],
            [
                'name' => 'Deal Of The Week',
                'keyword' => 'deal-of-the-week',
                'description' => 'Khối sản phẩm khuyến mãi của tuần',
                'model' => 'App\\Models\\Product',
            ],
            [
                'name' => 'Recommended Categories',
                'keyword' => 'recommended-categories',
                'description' => 'Các danh mục sản phẩm đề xuất',
                'model' => 'App\\Models\\ProductCatalogue',
            ]
        ];

        foreach ($widgets as $widgetData) {
            // Xóa cũ để tránh trùng (unique constraint)
            DB::table('widgets')->where('keyword', $widgetData['keyword'])->delete();

            // Lấy ngẫu nhiên vài ID (vd 1,2,3) để widget không rỗng hoàn toàn, 
            // người dùng có thể chỉnh lại trong admin sau
            $randomIds = null;
            if ($widgetData['model'] === 'App\\Models\\ProductCatalogue') {
                $randomIds = json_encode([1, 2, 3]); // Thử lấy 1 vài ID category
            } else {
                $randomIds = json_encode([1, 2, 3, 4, 5]); // Thử lấy vài ID product
            }

            DB::table('widgets')->insert([
                'name' => $widgetData['name'],
                'keyword' => $widgetData['keyword'],
                'description' => $widgetData['description'],
                'model' => $widgetData['model'],
                'model_id' => $randomIds,
                'short_code' => '[widget keyword="' . $widgetData['keyword'] . '"]',
                'publish' => 2,
                'options' => json_encode(['limit' => 10, 'order_by' => 'created_at', 'order' => 'desc']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
