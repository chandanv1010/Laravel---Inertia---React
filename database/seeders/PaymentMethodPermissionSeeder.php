<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentMethodPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lấy user đầu tiên hoặc null
        $user = DB::table('users')->first();
        $userId = $user ? $user->id : null;

        $permissions = [
            [
                'name' => 'Xem danh sách Phương thức thanh toán',
                'canonical' => 'setting:index',
                'publish' => 2,
                'description' => 'Cho phép xem danh sách phương thức thanh toán',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Cập nhật Phương thức thanh toán',
                'canonical' => 'setting:update',
                'publish' => 2,
                'description' => 'Cho phép cập nhật phương thức thanh toán',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
        ];

        // Insert permissions nếu chưa tồn tại
        foreach ($permissions as $permission) {
            DB::table('permissions')->updateOrInsert(
                ['canonical' => $permission['canonical']],
                $permission
            );
        }
        
        // Lấy các permission IDs vừa tạo
        $permissionIds = DB::table('permissions')
            ->whereIn('canonical', ['setting:index', 'setting:update'])
            ->pluck('id')
            ->toArray();
        
        // Gán permissions cho TẤT CẢ user catalogues
        $userCatalogues = DB::table('user_catalogues')->get();
        
        if ($userCatalogues->isEmpty()) {
            $this->command->warn('Không tìm thấy user catalogue nào. Vui lòng tạo user catalogue trước.');
            return;
        }
        
        $assignedCount = 0;
        foreach ($userCatalogues as $catalogue) {
            foreach ($permissionIds as $permissionId) {
                // Kiểm tra xem đã có permission này chưa
                $exists = DB::table('user_catalogue_permission')
                    ->where('user_catalogue_id', $catalogue->id)
                    ->where('permission_id', $permissionId)
                    ->exists();
                
                if (!$exists) {
                    DB::table('user_catalogue_permission')->insert([
                        'user_catalogue_id' => $catalogue->id,
                        'permission_id' => $permissionId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $assignedCount++;
                }
            }
        }
        
        $this->command->info("✅ Đã tạo và gán {$assignedCount} permissions cho payment methods.");
    }
}

