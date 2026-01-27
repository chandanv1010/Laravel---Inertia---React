<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\UserCatalogue;

class EnsureUserHasCustomerPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lấy user đầu tiên (user hiện tại đang đăng nhập)
        $user = User::first();
        if (!$user) {
            $this->command->warn('Không tìm thấy user nào!');
            return;
        }

        $this->command->info("Đang kiểm tra user: {$user->name} (ID: {$user->id})");

        // Kiểm tra user có thuộc user catalogue nào không
        $userCatalogues = $user->user_catalogues;
        
        if ($userCatalogues->isEmpty()) {
            // Nếu user chưa có UserCatalogue, lấy UserCatalogue đầu tiên (thường là Superadmin)
            $userCatalogue = UserCatalogue::where('publish', 2)->first();
            if (!$userCatalogue) {
                $this->command->warn('Không tìm thấy UserCatalogue nào! Vui lòng tạo UserCatalogue trước.');
                return;
            }
            
            // Gán user vào user catalogue
            DB::table('user_catalogue_user')->insertOrIgnore([
                'user_id' => $user->id,
                'user_catalogue_id' => $userCatalogue->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            $this->command->info("✅ Đã gán user vào UserCatalogue: {$userCatalogue->name} (ID: {$userCatalogue->id})");
            $userCatalogues = collect([$userCatalogue]);
        } else {
            $this->command->info("User đã thuộc các UserCatalogue: " . $userCatalogues->pluck('name')->join(', '));
        }

        // Kiểm tra permissions của user
        $user->load('user_catalogues.permissions');
        $userPermissions = $user->user_catalogues->flatMap(fn ($catalogue) => $catalogue->permissions)->pluck('canonical')->unique();
        
        $customerPermissions = [
            'customer_catalogue:index',
            'customer_catalogue:store',
            'customer_catalogue:update',
            'customer_catalogue:delete',
            'customer_catalogue:bulkDestroy',
            'customer_catalogue:bulkUpdate',
            'customer:index',
            'customer:store',
            'customer:update',
            'customer:delete',
            'customer:bulkDestroy',
            'customer:bulkUpdate',
        ];

        $hasAllPermissions = true;
        $missingPermissions = [];
        
        foreach ($customerPermissions as $permission) {
            if (!$userPermissions->contains($permission)) {
                $hasAllPermissions = false;
                $missingPermissions[] = $permission;
            }
        }

        if ($hasAllPermissions) {
            $this->command->info('✅ User đã có đầy đủ customer permissions!');
            $this->command->info('💡 Nếu vẫn bị 403, vui lòng đăng xuất và đăng nhập lại để refresh permissions.');
        } else {
            $this->command->warn('⚠️  User thiếu các permissions: ' . implode(', ', $missingPermissions));
            $this->command->info('Đang gán permissions cho user catalogues...');
            
            // Lấy permission IDs
            $permissionIds = DB::table('permissions')
                ->whereIn('canonical', $customerPermissions)
                ->pluck('id')
                ->toArray();

            if (empty($permissionIds)) {
                $this->command->error('Không tìm thấy customer permissions! Vui lòng chạy CustomerPermissionSeeder trước.');
                return;
            }

            // Gán permissions cho các user catalogues của user
            foreach ($userCatalogues as $userCatalogue) {
                $existingPermissions = DB::table('user_catalogue_permission')
                    ->where('user_catalogue_id', $userCatalogue->id)
                    ->whereIn('permission_id', $permissionIds)
                    ->pluck('permission_id')
                    ->toArray();

                $newPermissions = array_diff($permissionIds, $existingPermissions);

                if (!empty($newPermissions)) {
                    $insertData = array_map(function ($permissionId) use ($userCatalogue) {
                        return [
                            'user_catalogue_id' => $userCatalogue->id,
                            'permission_id' => $permissionId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }, $newPermissions);

                    DB::table('user_catalogue_permission')->insert($insertData);
                    $this->command->info("✅ Đã gán " . count($newPermissions) . " permissions cho UserCatalogue: {$userCatalogue->name}");
                }
            }
            
            $this->command->info('✅ Đã gán đầy đủ customer permissions!');
            $this->command->info('💡 Vui lòng đăng xuất và đăng nhập lại để áp dụng quyền mới.');
        }
    }
}
