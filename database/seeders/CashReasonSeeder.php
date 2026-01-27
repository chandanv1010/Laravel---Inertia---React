<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CashReason;

class CashReasonSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $receiptReasons = [
            ['name' => 'Thu khác', 'is_default' => true, 'order' => 1],
            ['name' => 'Thu tiền đối tác vận chuyển', 'is_default' => false, 'order' => 2],
            ['name' => 'Thu tiền đối tác thanh toán', 'is_default' => false, 'order' => 3],
            ['name' => 'Thu tiền hoàn trả từ NCC', 'is_default' => false, 'order' => 4],
            ['name' => 'Thu tiền khách hàng (không theo hóa đơn)', 'is_default' => false, 'order' => 5],
            ['name' => 'Thu tiền bán hàng', 'is_default' => false, 'order' => 6],
        ];

        $paymentReasons = [
            ['name' => 'Thu khác', 'is_default' => true, 'order' => 1],
            ['name' => 'Thu tiền đối tác vận chuyển', 'is_default' => false, 'order' => 2],
            ['name' => 'Thu tiền đối tác thanh toán', 'is_default' => false, 'order' => 3],
            ['name' => 'Thu tiền hoàn trả từ NCC', 'is_default' => false, 'order' => 4],
            ['name' => 'Thu tiền khách hàng (không theo hóa đơn)', 'is_default' => false, 'order' => 5],
        ];

        // Create receipt reasons
        foreach ($receiptReasons as $reason) {
            CashReason::create([
                'name' => $reason['name'],
                'type' => 'receipt',
                'is_default' => $reason['is_default'],
                'publish' => '2',
                'order' => $reason['order'],
            ]);
        }

        // Create payment reasons
        foreach ($paymentReasons as $reason) {
            CashReason::create([
                'name' => $reason['name'],
                'type' => 'payment',
                'is_default' => $reason['is_default'],
                'publish' => '2',
                'order' => $reason['order'],
            ]);
        }
    }
}
