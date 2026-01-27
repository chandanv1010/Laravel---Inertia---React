<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CustomerCatalogue;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CustomerCatalogueSeeder extends Seeder
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

        $catalogues = [
            [
                'name' => 'Khách Hàng Thông Thường',
                'description' => 'Nhóm khách hàng thông thường',
                'order' => 1,
                'publish' => 2,
                'user_id' => $user->id,
            ],
            [
                'name' => 'Khách Hàng Quảng cáo',
                'description' => 'Nhóm khách hàng quảng cáo',
                'order' => 2,
                'publish' => 2,
                'user_id' => $user->id,
            ],
        ];

        foreach ($catalogues as $catalogue) {
            CustomerCatalogue::updateOrCreate(
                ['name' => $catalogue['name']],
                $catalogue
            );
        }

        $this->command->info('Created ' . count($catalogues) . ' customer catalogues');
    }
}
