<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Language;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Tạo User trước
        $user = User::firstOrCreate(
            ['email' => 'chandanv1010@gmail.com'],
            [
                'name' => 'Nguyễn Công Tuấn',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // 2. Tạo Language (cần có trước các seeder khác)
        Language::firstOrCreate(
            ['canonical' => 'vn'],
            [
                'name' => 'Tiếng Việt',
                'canonical' => 'vn',
                'image' => 'vn.png',
                'description' => 'Ngôn ngữ Tiếng Việt',
                'publish' => 1,
                'user_id' => $user->id,
            ]
        );

        Language::firstOrCreate(
            ['canonical' => 'en'],
            [
                'name' => 'English',
                'canonical' => 'en',
                'image' => 'en.png',
                'description' => 'English Language',
                'publish' => 1,
                'user_id' => $user->id,
            ]
        );

        // 3. Warehouse (cần cho product)
        $this->call(WarehouseSeeder::class);

        // 3.5. Supplier
        $this->call(SupplierSeeder::class);

        // 5. Customer Catalogue
        $this->call(CustomerCatalogueSeeder::class);

        // 6. Customer
        $this->call(CustomerSeeder::class);

        // 7. Permissions
        $this->call(ProductPermissionSeeder::class);
        $this->call(CustomerPermissionSeeder::class);
        $this->call(WarehousePermissionSeeder::class);
        $this->call(LogPermissionSeeder::class);
        $this->call(RouterPermissionSeeder::class);
        $this->call(SettingPermissionSeeder::class);
        $this->call(UserPermissionSeeder::class);
        $this->call(LanguagePermissionSeeder::class);
        $this->call(PostPermissionSeeder::class);
        $this->call(CKFinderPermissionSeeder::class);
        $this->call(PermissionPermissionSeeder::class);
        $this->call(SupplierPermissionSeeder::class);
        $this->call(ImportOrderPermissionSeeder::class);
        $this->call(PaymentMethodPermissionSeeder::class);

        // 8. Assign permissions to user
        $this->call(GrantAllPermissionsToUserSeeder::class);

        // 9. Post Catalogues (tạo Language nếu chưa có)
        $this->call(PostCatalogueSeeder::class);

        // 10. Posts
        $this->call(PostSeeder::class);

        // 11. Product Catalogues
        $this->call(ProductCatalogueSeeder::class);

        // 12. Products (200 sản phẩm với đủ các trường hợp)
        $this->call(ProductSeeder::class);

        // 13. Payment Methods (phương thức thanh toán thủ công mặc định)
        $this->call(PaymentMethodSeeder::class);

        $this->command->info('✅ Đã khôi phục tất cả dữ liệu mẫu thành công!');
    }
}
