<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class CashBookPermissionSeeder extends Seeder
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
                'snake_module' => 'cash_book_transaction',
                'display_name' => 'Phiếu thu chi',
            ],
            [
                'snake_module' => 'cash_book_reason',
                'display_name' => 'Lý do thu chi',
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
                        'name' => "Xem chi tiết {$display_name}",
                        'canonical' => "{$snake_module}:show",
                        'publish' => 2,
                        'description' => "Cho phép xem chi tiết {$display_name}",
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
                    'cash_book_transaction:index',
                    'cash_book_transaction:store',
                    'cash_book_transaction:show',
                    'cash_book_transaction:update',
                    'cash_book_transaction:delete',
                    'cash_book_transaction:bulkUpdate',
                    'cash_book_reason:index',
                    'cash_book_reason:store',
                    'cash_book_reason:show',
                    'cash_book_reason:update',
                    'cash_book_reason:delete',
                    'cash_book_reason:bulkUpdate',
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
                    $this->command->info("Đã gán {$assignedCount} cash book permissions cho " . $userCatalogues->count() . " user catalogue(s).");
                } else {
                    $this->command->info('Tất cả user catalogues đã có cash book permissions.');
                }
            }

            DB::commit();
            $this->command->info('✅ Đã tạo permissions cho Cash Book module thành công!');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}
