<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CleanTestPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::beginTransaction();
        try {
            // Tìm tất cả permissions có chứa "test", "final_product", "temp_module" trong canonical
            $testPermissions = DB::table('permissions')
                ->where(function($query) {
                    $query->where('canonical', 'like', '%test%')
                          ->orWhere('canonical', 'like', '%final_product%')
                          ->orWhere('canonical', 'like', '%temp_module%');
                })
                ->get();

            if ($testPermissions->isEmpty()) {
                $this->command->info('✅ Không tìm thấy permissions nào liên quan đến "test", "final_product", "temp_module".');
                DB::commit();
                return;
            }

            $this->command->info("Tìm thấy {$testPermissions->count()} permissions liên quan đến 'test', 'final_product', 'temp_module':");
            foreach ($testPermissions as $permission) {
                $this->command->line("  - {$permission->canonical} (ID: {$permission->id})");
            }

            $permissionIds = $testPermissions->pluck('id')->toArray();

            // 1. Xóa các bản ghi trong bảng pivot user_catalogue_permission
            $deletedPivotCount = DB::table('user_catalogue_permission')
                ->whereIn('permission_id', $permissionIds)
                ->delete();

            $this->command->info("✅ Đã xóa {$deletedPivotCount} bản ghi trong bảng user_catalogue_permission");

            // 2. Xóa các permissions (force delete - xóa cứng khỏi database)
            $deletedPermissionsCount = DB::table('permissions')
                ->whereIn('id', $permissionIds)
                ->delete();

            $this->command->info("✅ Đã xóa (force delete) {$deletedPermissionsCount} permissions khỏi database");

            DB::commit();
            $this->command->info('✅ Đã xóa tất cả permissions liên quan đến "test", "final_product", "temp_module" thành công!');
            $this->command->info('💡 Vui lòng clear cache: php artisan cache:clear');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}
