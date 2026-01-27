<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class ProductPermissionSeeder extends Seeder
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
                'snake_module' => 'product_catalogue',
                'display_name' => 'Nhóm Sản Phẩm',
            ],
            [
                'snake_module' => 'product',
                'display_name' => 'Sản Phẩm',
            ],
            [
                'snake_module' => 'product_brand',
                'display_name' => 'Thương Hiệu',
            ],
            [
                'snake_module' => 'product_variant',
                'display_name' => 'Phiên Bản Sản Phẩm',
            ],
            [
                'snake_module' => 'product_batch',
                'display_name' => 'Lô Sản Phẩm',
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

            DB::commit();
            $this->command->info('✅ Đã tạo permissions cho Product modules thành công!');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}

