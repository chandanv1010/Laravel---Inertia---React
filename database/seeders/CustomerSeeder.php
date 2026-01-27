<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;
use App\Models\CustomerCatalogue;
use App\Models\User;
use Faker\Factory as Faker;

class CustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = Faker::create('vi_VN');
        
        $user = User::first();
        if (!$user) {
            $user = User::create([
                'name' => 'Admin',
                'email' => 'admin@example.com',
                'password' => bcrypt('password'),
            ]);
        }

        $catalogues = CustomerCatalogue::all();
        if ($catalogues->isEmpty()) {
            $this->command->warn('No customer catalogues found. Please run CustomerCatalogueSeeder first.');
            return;
        }

        $genders = ['male', 'female', 'other'];
        $provinces = ['Ho Chi Minh', 'Ha Noi', 'Da Nang', 'Hai Phong', 'Can Tho'];
        $districts = ['Quan 1', 'Quan 2', 'Quan 3', 'Quan 4', 'Quan 5'];
        $wards = ['Phuong 1', 'Phuong 2', 'Phuong 3', 'Phuong 4', 'Phuong 5'];

        for ($i = 1; $i <= 20; $i++) {
            $gender = $faker->randomElement($genders);
            $catalogue = $catalogues->random();
            
            Customer::create([
                'user_id' => $user->id,
                'customer_catalogue_id' => $catalogue->id,
                'last_name' => $faker->lastName,
                'first_name' => $faker->firstName,
                'email' => $faker->unique()->safeEmail,
                'phone' => $faker->phoneNumber,
                'date_of_birth' => $faker->date('Y-m-d', '-18 years'),
                'gender' => $gender,
                'receive_promotional_emails' => $faker->boolean(70),
                'shipping_last_name' => $faker->lastName,
                'shipping_first_name' => $faker->firstName,
                'shipping_company' => $faker->optional()->company,
                'shipping_phone' => $faker->phoneNumber,
                'shipping_country' => 'Vietnam',
                'shipping_postal_code' => $faker->postcode,
                'shipping_province' => $faker->randomElement($provinces),
                'shipping_district' => $faker->randomElement($districts),
                'shipping_ward' => $faker->randomElement($wards),
                'shipping_address' => $faker->streetAddress,
                'use_new_address_format' => $faker->boolean(80),
                'notes' => $faker->optional()->sentence,
                'publish' => $faker->randomElement([1, 2]),
            ]);
        }

        $this->command->info('Created 20 sample customers');
    }
}
