<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class PromotionPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::first();
        $userId = $user ? $user->id : 1;

        $permissions = [
            [
                'name' => 'Xem danh sách Khuyến mãi',
                'canonical' => 'promotion:index',
                'publish' => 2,
                'description' => 'Cho phép xem danh sách khuyến mãi',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Tạo mới Khuyến mãi',
                'canonical' => 'promotion:store',
                'publish' => 2,
                'description' => 'Cho phép tạo mới khuyến mãi',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Cập nhật Khuyến mãi',
                'canonical' => 'promotion:update',
                'publish' => 2,
                'description' => 'Cho phép cập nhật khuyến mãi',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Xóa Khuyến mãi',
                'canonical' => 'promotion:delete',
                'publish' => 2,
                'description' => 'Cho phép xóa khuyến mãi',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Cập nhật nhiều Khuyến mãi',
                'canonical' => 'promotion:bulkUpdate',
                'publish' => 2,
                'description' => 'Cho phép cập nhật nhiều khuyến mãi',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
        ];

        DB::beginTransaction();
        try {
            DB::table('permissions')->insertOrIgnore($permissions);

            $permissionIds = DB::table('permissions')
                ->whereIn('canonical', [
                    'promotion:index',
                    'promotion:store',
                    'promotion:update',
                    'promotion:delete',
                    'promotion:bulkUpdate',
                ])
                ->pluck('id')
                ->toArray();

            $userCatalogues = DB::table('user_catalogues')->get();
            
            if ($userCatalogues->isEmpty()) {
                $this->command->warn('Không tìm thấy user catalogue nào. Vui lòng tạo user catalogue trước.');
            } else {
                $assignedCount = 0;
                foreach ($userCatalogues as $catalogue) {
                    foreach ($permissionIds as $permissionId) {
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
                
                if ($assignedCount > 0) {
                    $this->command->info("Đã gán {$assignedCount} promotion permissions cho " . $userCatalogues->count() . " user catalogue(s).");
                } else {
                    $this->command->info('Tất cả user catalogues đã có promotion permissions.');
                }
            }

            DB::commit();
            $this->command->info('✅ Đã tạo permissions cho Promotion module thành công!');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}

