<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\UserCatalogue;

class AssignCustomerPermissionsToUserSeeder extends Seeder
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

        // Lấy UserCatalogue của user
        $userCatalogues = $user->user_catalogues;
        
        if ($userCatalogues->isEmpty()) {
            // Nếu user chưa có UserCatalogue, lấy UserCatalogue đầu tiên hoặc tạo mới
            $userCatalogue = UserCatalogue::first();
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
            
            $userCatalogues = collect([$userCatalogue]);
            $this->command->info("✅ Đã gán user vào UserCatalogue: {$userCatalogue->name}");
        }

        // Lấy tất cả Customer permissions
        $customerPermissions = DB::table('permissions')
            ->whereIn('canonical', [
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
            ])
            ->pluck('id')
            ->toArray();

        if (empty($customerPermissions)) {
            $this->command->warn('Không tìm thấy Customer permissions! Vui lòng chạy CustomerPermissionSeeder trước.');
            return;
        }

        DB::beginTransaction();
        try {
            foreach ($userCatalogues as $userCatalogue) {
                // Gán tất cả permissions cho user_catalogue
                $existingPermissions = DB::table('user_catalogue_permission')
                    ->where('user_catalogue_id', $userCatalogue->id)
                    ->pluck('permission_id')
                    ->toArray();

                $newPermissions = array_diff($customerPermissions, $existingPermissions);

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
                    $this->command->info("✅ Đã gán " . count($newPermissions) . " customer permissions cho UserCatalogue: {$userCatalogue->name} (ID: {$userCatalogue->id})");
                } else {
                    $this->command->info("ℹ️  UserCatalogue: {$userCatalogue->name} (ID: {$userCatalogue->id}) đã có đầy đủ customer permissions.");
                }
            }

            DB::commit();
            $this->command->info('✅ Đã gán Customer permissions cho user thành công!');
            $this->command->info('💡 Vui lòng đăng xuất và đăng nhập lại để áp dụng quyền mới.');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}
