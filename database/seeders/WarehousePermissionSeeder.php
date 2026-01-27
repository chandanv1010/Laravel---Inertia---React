<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class WarehousePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::first();
        $userId = $user ? $user->id : 1;

        $modules = [
            [
                'snake_module' => 'warehouse',
                'display_name' => 'Kho hàng',
            ],
        ];

        DB::beginTransaction();
        try {
            foreach ($modules as $module) {
                $snake_module = $module['snake_module'];
                $display_name = $module['display_name'];

                $permissions = [
                    [
                        'name' => "Xem danh sách {$display_name}",
                        'canonical' => "{$snake_module}:index",
                        'publish' => 2,
                        'description' => "Cho phép xem danh sách {$display_name}",
                        'created_at' => now(),
                        'updated_at' => now(),
                        'user_id' => $userId,
                    ],
                    [
                        'name' => "Tạo mới {$display_name}",
                        'canonical' => "{$snake_module}:store",
                        'publish' => 2,
                        'description' => "Cho phép tạo mới {$display_name}",
                        'created_at' => now(),
                        'updated_at' => now(),
                        'user_id' => $userId,
                    ],
                    [
                        'name' => "Cập nhật {$display_name}",
                        'canonical' => "{$snake_module}:update",
                        'publish' => 2,
                        'description' => "Cho phép cập nhật {$display_name}",
                        'created_at' => now(),
                        'updated_at' => now(),
                        'user_id' => $userId,
                    ],
                    [
                        'name' => "Xóa {$display_name}",
                        'canonical' => "{$snake_module}:delete",
                        'publish' => 2,
                        'description' => "Cho phép xóa {$display_name}",
                        'created_at' => now(),
                        'updated_at' => now(),
                        'user_id' => $userId,
                    ],
                    [
                        'name' => "Xóa nhiều bản ghi {$display_name}",
                        'canonical' => "{$snake_module}:bulkDestroy",
                        'publish' => 2,
                        'description' => "Cho phép xóa nhiều {$display_name}",
                        'created_at' => now(),
                        'updated_at' => now(),
                        'user_id' => $userId,
                    ],
                    [
                        'name' => "Cập nhật nhiều bản ghi {$display_name}",
                        'canonical' => "{$snake_module}:bulkUpdate",
                        'publish' => 2,
                        'description' => "Cho phép cập nhật nhiều {$display_name}",
                        'created_at' => now(),
                        'updated_at' => now(),
                        'user_id' => $userId,
                    ],
                ];

                DB::table('permissions')->insertOrIgnore($permissions);
            }

            // Lấy các permission IDs vừa tạo
            $permissionIds = DB::table('permissions')
                ->whereIn('canonical', [
                    'warehouse:index',
                    'warehouse:store',
                    'warehouse:update',
                    'warehouse:delete',
                    'warehouse:bulkDestroy',
                    'warehouse:bulkUpdate',
                ])
                ->pluck('id')
                ->toArray();

            // Gán permissions cho TẤT CẢ user catalogues
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
                    $this->command->info("Đã gán {$assignedCount} warehouse permissions cho " . $userCatalogues->count() . " user catalogue(s).");
                } else {
                    $this->command->info('Tất cả user catalogues đã có warehouse permissions.');
                }
            }

            DB::commit();
            $this->command->info('✅ Đã tạo permissions cho Warehouse module thành công!');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}
