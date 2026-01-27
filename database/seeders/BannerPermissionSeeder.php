<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class BannerPermissionSeeder extends Seeder
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
                'name' => 'Xem danh sách Banner',
                'canonical' => 'banner:index',
                'publish' => 2,
                'description' => 'Cho phép xem danh sách banner',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Tạo mới Banner',
                'canonical' => 'banner:store',
                'publish' => 2,
                'description' => 'Cho phép tạo mới banner',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Cập nhật Banner',
                'canonical' => 'banner:update',
                'publish' => 2,
                'description' => 'Cho phép cập nhật banner',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Xóa Banner',
                'canonical' => 'banner:delete',
                'publish' => 2,
                'description' => 'Cho phép xóa banner',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Cập nhật nhiều Banner',
                'canonical' => 'banner:bulkUpdate',
                'publish' => 2,
                'description' => 'Cho phép cập nhật nhiều banner',
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
                    'banner:index',
                    'banner:store',
                    'banner:update',
                    'banner:delete',
                    'banner:bulkUpdate',
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
                    $this->command->info("Đã gán {$assignedCount} banner permissions cho " . $userCatalogues->count() . " user catalogue(s).");
                } else {
                    $this->command->info('Tất cả user catalogues đã có banner permissions.');
                }
            }

            DB::commit();
            $this->command->info('✅ Đã tạo permissions cho Banner module thành công!');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}

