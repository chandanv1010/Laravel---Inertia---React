<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class Product206ReviewsSeeder extends Seeder
{
    /**
     * Seed reviews for Product ID 206
     * Creates 5 sample reviews with different ratings
     */
    public function run(): void
    {
        $now = Carbon::now();
        
        $reviews = [
            [
                'reviewable_id' => 206,
                'reviewable_type' => 'App\\Models\\Product',
                'user_id' => null,
                'fullname' => 'Nguyễn Văn A',
                'email' => 'nguyenvana@example.com',
                'phone' => '0901234567',
                'score' => 5,
                'content' => 'Sản phẩm rất tốt, chất lượng vượt mong đợi! Giao hàng nhanh.',
                'publish' => 2, // published
                'created_at' => $now->copy()->subDays(10),
                'updated_at' => $now->copy()->subDays(10),
            ],
            [
                'reviewable_id' => 206,
                'reviewable_type' => 'App\\Models\\Product',
                'user_id' => null,
                'fullname' => 'Trần Thị B',
                'email' => 'tranthib@example.com',
                'phone' => '0902345678',
                'score' => 5,
                'content' => 'Rất hài lòng với sản phẩm. Đóng gói cẩn thận, shop phục vụ nhiệt tình.',
                'publish' => 2,
                'created_at' => $now->copy()->subDays(8),
                'updated_at' => $now->copy()->subDays(8),
            ],
            [
                'reviewable_id' => 206,
                'reviewable_type' => 'App\\Models\\Product',
                'user_id' => null,
                'fullname' => 'Lê Văn C',
                'email' => 'levanc@example.com',
                'phone' => '0903456789',
                'score' => 4,
                'content' => 'Sản phẩm tốt, đúng mô tả. Giá hợp lý.',
                'publish' => 2,
                'created_at' => $now->copy()->subDays(5),
                'updated_at' => $now->copy()->subDays(5),
            ],
            [
                'reviewable_id' => 206,
                'reviewable_type' => 'App\\Models\\Product',
                'user_id' => null,
                'fullname' => 'Phạm Thị D',
                'email' => 'phamthid@example.com',
                'phone' => '0904567890',
                'score' => 5,
                'content' => 'Chất lượng tuyệt vời! Sẽ tiếp tục ủng hộ shop.',
                'publish' => 2,
                'created_at' => $now->copy()->subDays(3),
                'updated_at' => $now->copy()->subDays(3),
            ],
            [
                'reviewable_id' => 206,
                'reviewable_type' => 'App\\Models\\Product',
                'user_id' => null,
                'fullname' => 'Hoàng Văn E',
                'email' => 'hoangvane@example.com',
                'phone' => '0905678901',
                'score' => 4,
                'content' => 'Sản phẩm ok, giao hàng hơi lâu nhưng chất lượng đáng tin cậy.',
                'publish' => 2,
                'created_at' => $now->copy()->subDays(1),
                'updated_at' => $now->copy()->subDays(1),
            ],
        ];

        foreach ($reviews as $review) {
            DB::table('reviews')->insert($review);
        }

        $this->command->info('✅ Created 5 reviews for Product 206');
        $this->command->info('   Average rating: 4.6/5.0');
        $this->command->info('   Total reviews: 5');
    }
}
