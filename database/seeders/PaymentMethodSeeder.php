<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lấy user đầu tiên hoặc null
        $user = DB::table('users')->first();
        $userId = $user ? $user->id : 1;

        $paymentMethods = [
            [
                'name' => 'Chuyển khoản',
                'code' => 'bank_transfer',
                'type' => 'manual',
                'status' => 'active',
                'is_default' => false,
                'provider' => null,
                'config' => null,
                'description' => 'Cập nhật thông tin tài khoản để thanh toán bằng mã VietQR động dễ dàng hơn.',
                'icon' => null,
                'order' => 1,
                'user_id' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Tiền mặt',
                'code' => 'cash',
                'type' => 'manual',
                'status' => 'active',
                'is_default' => true, // Đặt mặc định
                'provider' => null,
                'config' => null,
                'description' => 'Thanh toán bằng tiền mặt tại cửa hàng.',
                'icon' => null,
                'order' => 2,
                'user_id' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Thanh toán thẻ',
                'code' => 'card_payment',
                'type' => 'manual',
                'status' => 'active',
                'is_default' => false,
                'provider' => null,
                'config' => null,
                'description' => 'Thanh toán bằng thẻ tín dụng hoặc thẻ ghi nợ.',
                'icon' => null,
                'order' => 3,
                'user_id' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Thu hộ (COD)',
                'code' => 'cod',
                'type' => 'manual',
                'status' => 'active',
                'is_default' => false,
                'provider' => null,
                'config' => null,
                'description' => 'Thanh toán khi nhận hàng (Cash on Delivery).',
                'icon' => null,
                'order' => 4,
                'user_id' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Insert payment methods nếu chưa tồn tại (dựa trên code)
        foreach ($paymentMethods as $method) {
            DB::table('payment_methods')->updateOrInsert(
                ['code' => $method['code']],
                $method
            );
        }
        
        $this->command->info('✅ Đã seed dữ liệu phương thức thanh toán thủ công mặc định.');
    }
}

