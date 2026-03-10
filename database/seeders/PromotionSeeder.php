<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PromotionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Tạm thời tắt kiểm tra khóa ngoại để truncate
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Xóa dữ liệu cũ (Tùy chọn)
        DB::table('promotion_product_variant')->truncate();
        DB::table('promotions')->truncate();

        // Bật lại kiểm tra khóa ngoại
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $now = Carbon::now();
        $nextMonth = Carbon::now()->addMonth();

        $promotions = [
            // 1. Giảm giá cho toàn bộ đơn hàng (Order Discount) - Giảm 10% cho đơn từ 500k
            [
                'id' => 1,
                'name' => 'Giảm 10% Đơn Tối Thiểu 500k',
                'type' => 'order_discount',
                'discount_type' => 'percentage',
                'discount_value' => 10.00,
                'combo_price' => null,
                'max_discount_value' => 100000.00, // Tối đa 100k
                'condition_type' => 'min_order_amount',
                'condition_value' => 500000.00,
                'apply_source' => 'all', // Áp dụng toàn bộ SP
                'customer_group_type' => 'all',
                'store_type' => 'all',
                'combine_with_order_discount' => 0,
                'combine_with_product_discount' => 1,
                'combine_with_free_shipping' => 1,
                'start_date' => $now,
                'end_date' => $nextMonth,
                'no_end_date' => 0,
                'publish' => '2', // Active
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // 2. Giảm giá sản phẩm cụ thể (Product Discount) - Giảm trực tiếp 50k
            [
                'id' => 2,
                'name' => 'Giảm Giá Trực Tiếp Lên Tới 50k',
                'type' => 'product_discount',
                'discount_type' => 'fixed_amount',
                'discount_value' => 50000.00,
                'combo_price' => null,
                'max_discount_value' => 50000.00,
                'condition_type' => 'none',
                'condition_value' => null,
                'apply_source' => 'product_variant', // Sẽ áp dụng cho danh sách id nhất định
                'customer_group_type' => 'all',
                'store_type' => 'all',
                'combine_with_order_discount' => 1,
                'combine_with_product_discount' => 0,
                'combine_with_free_shipping' => 1,
                'start_date' => $now,
                'end_date' => $nextMonth,
                'no_end_date' => 0,
                'publish' => '2',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // 3. Mua X Tặng Y (Buy X get Y) - Đồng giá
            [
                'id' => 3,
                'name' => 'Mua 2 Tặng 1 Cùng Loại',
                'type' => 'buy_x_get_y',
                'discount_type' => 'free',
                'discount_value' => null,
                'combo_price' => null,
                'max_discount_value' => null,
                'condition_type' => 'min_product_quantity',
                'condition_value' => 2,
                'apply_source' => 'product_variant',
                'customer_group_type' => 'all',
                'store_type' => 'all',
                'combine_with_order_discount' => 1,
                'combine_with_product_discount' => 0,
                'combine_with_free_shipping' => 0,
                'start_date' => $now,
                'end_date' => $nextMonth,
                'no_end_date' => 0,
                'publish' => '2',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // 4. Combo giảm giá đặc biệt (Combo Discount)
            [
                'id' => 4,
                'name' => 'Combo Siêu Tiết Kiệm Đồng Giá 99k',
                'type' => 'combo',
                'discount_type' => 'same_price',
                'discount_value' => null,
                'combo_price' => 99000.00, // Đồng giá 99k khi mua 2 sp
                'max_discount_value' => null,
                'condition_type' => 'min_product_quantity',
                'condition_value' => 2,
                'apply_source' => 'product_variant',
                'customer_group_type' => 'all',
                'store_type' => 'all',
                'combine_with_order_discount' => 0,
                'combine_with_product_discount' => 0,
                'combine_with_free_shipping' => 0,
                'start_date' => $now,
                'end_date' => $nextMonth,
                'no_end_date' => 0,
                'publish' => '2',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        DB::table('promotions')->insert($promotions);

        // Lấy 10 sản phẩm ngẫu nhiên để áp dụng CTKM loại product_discount, buy_x_get_y và combo
        $products = DB::table('products')->where('publish', '2')->pluck('id')->toArray();
        if (count($products) > 0) {
            $productVariantLinks = [];
            // Phân chia SP cho Khuyến mãi ID 2 (Product discount)
            for ($i = 0; $i < min(3, count($products)); $i++) {
                $productVariantLinks[] = [
                    'promotion_id' => 2,
                    'product_id' => $products[$i],
                    'product_variant_id' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            // Phân chia SP cho Khuyến mãi ID 3 (Buy X get Y)
            if (count($products) > 3) {
                $productVariantLinks[] = [
                    'promotion_id' => 3,
                    'product_id' => $products[3],
                    'product_variant_id' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                if (count($products) > 4) {
                    $productVariantLinks[] = [
                        'promotion_id' => 3,
                        'product_id' => $products[4],
                        'product_variant_id' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            // Phân chia SP cho Khuyến mãi ID 4 (Combo)
            if (count($products) > 5) {
                $productVariantLinks[] = [
                    'promotion_id' => 4,
                    'product_id' => $products[5],
                    'product_variant_id' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                if (count($products) > 6) {
                    $productVariantLinks[] = [
                        'promotion_id' => 4,
                        'product_id' => $products[6],
                        'product_variant_id' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            DB::table('promotion_product_variant')->insert($productVariantLinks);
        }
    }
}
