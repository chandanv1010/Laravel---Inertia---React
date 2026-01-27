<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class PermissionPermissionSeeder extends Seeder
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
                'snake_module' => 'permission',
                'display_name' => 'Quyền',
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
                        'name' => "Cập nhật hàng loạt {$display_name}",
                        'canonical' => "{$snake_module}:bulkUpdate",
                        'publish' => 2,
                        'description' => "Cho phép cập nhật hàng loạt {$display_name}",
                        'created_at' => now(),
                        'updated_at' => now(),
                        'user_id' => $userId,
                    ],
                ];

                foreach ($permissions as $permission) {
                    DB::table('permissions')->updateOrInsert(
                        ['canonical' => $permission['canonical']],
                        $permission
                    );
                }
            }

            DB::commit();
            $this->command->info('✅ Đã tạo permissions cho Permission module thành công!');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}
