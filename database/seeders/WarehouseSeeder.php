<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class WarehouseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\Warehouse::firstOrCreate(
            ['code' => 'MAIN'],
            [
                'name' => 'Cửa hàng chính',
                'address' => 'The Manor Central Park, Nguyễn Xiển, Đại Kim, Hoàng Mai, Hà Nội (ECOPARK)',
                'phone' => '0901234567',
                'email' => 'khochinh@example.com',
                'description' => 'Kho hàng mặc định hệ thống',
                'publish' => '2',
            ]
        );

        \App\Models\Warehouse::firstOrCreate(
            ['code' => 'KHO2'],
            [
                'name' => 'Kho Aqua Bay',
                'address' => 'Aqua Bay, Khu đô thị ECOPARK, Văn Giang, Hưng Yên',
                'phone' => '0912345678',
                'email' => 'khoq7@example.com',
                'description' => 'Kho phụ tại ECOPARK',
                'publish' => '2',
            ]
        );

        \App\Models\Warehouse::firstOrCreate(
            ['code' => 'KHO3'],
            [
                'name' => 'Kho Rừng Cọ',
                'address' => 'Rừng Cọ, Khu đô thị ECOPARK, Văn Giang, Hưng Yên',
                'phone' => '0923456789',
                'email' => 'khotd@example.com',
                'description' => 'Kho tại ECOPARK - Rừng Cọ',
                'publish' => '2',
            ]
        );
    }
}
