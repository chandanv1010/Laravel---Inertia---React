<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Widget;
use Illuminate\Support\Facades\Log;

class RecommendedCategoriesWidgetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if widget already exists
        $existingWidget = Widget::where('keyword', 'recommended-categories')->first();
        
        if ($existingWidget) {
            $this->command->info('Widget "recommended-categories" already exists. Skipping...');
            return;
        }

        // Create the recommended categories widget
        // Using all 6 parent categories that have children:
        // 1: Sữa & Trứng, 2: Đồ Ăn Vặt, 3: Thực Phẩm Đông Lạnh
        // 4: Rau Củ Quả, 5: Cá & Thịt, 6: Bánh Ngọt
        $widget = Widget::create([
            'name' => 'Đề xuất cho bạn',
            'keyword' => 'recommended-categories',
            'description' => 'Widget hiển thị sản phẩm theo danh mục với tabs lọc',
            'model' => 'App\\Models\\ProductCatalogue',
            'model_id' => [1, 2, 3, 4, 5, 6], // All 6 parent categories
            'options' => [
                '_global' => [
                    'items_per_category' => 12,
                    'display_style' => 'grid',
                    'columns' => 6,
                    'show_all_tab' => true,
                ]
            ],
            'publish' => 2, // Active
        ]);

        $this->command->info('Widget "recommended-categories" created successfully with ID: ' . $widget->id);
    }
}
