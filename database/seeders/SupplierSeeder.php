<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Supplier;
use App\Models\User;

class SupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::first();
        $userId = $user ? $user->id : 1;

        $suppliers = [
            [
                'code' => 'NCC001',
                'name' => 'Công ty TNHH ABC',
                'phone' => '0901234567',
                'email' => 'abc@supplier.com',
                'address' => '123 Đường Nguyễn Văn Linh, Quận 7, TP.HCM',
                'tax_code' => '0123456789',
                'publish' => 2,
                'user_id' => $userId,
            ],
            [
                'code' => 'NCC002',
                'name' => 'Công ty CP XYZ',
                'phone' => '0912345678',
                'email' => 'xyz@supplier.com',
                'address' => '456 Đường Lê Văn Việt, Quận 9, TP.HCM',
                'tax_code' => '0123456790',
                'publish' => 2,
                'user_id' => $userId,
            ],
            [
                'code' => 'NCC003',
                'name' => 'Nhà phân phối DEF',
                'phone' => '0923456789',
                'email' => 'def@supplier.com',
                'address' => '789 Đường Cách Mạng Tháng 8, Quận 3, TP.HCM',
                'tax_code' => '0123456791',
                'publish' => 2,
                'user_id' => $userId,
            ],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::firstOrCreate(
                ['code' => $supplier['code']],
                $supplier
            );
        }

        $this->command->info('✅ Đã tạo ' . count($suppliers) . ' nhà cung cấp mẫu!');
    }
}
