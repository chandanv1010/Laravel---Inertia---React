<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $perms = [
            ['name' => 'Xem danh sách Đơn Hàng', 'canonical' => 'order:index', 'description' => 'Cho phép xem danh sách Đơn Hàng', 'user_id' => 1, 'publish' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Xem chi tiết Đơn Hàng', 'canonical' => 'order:show', 'description' => 'Cho phép xem chi tiết Đơn Hàng', 'user_id' => 1, 'publish' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Cập nhật Đơn Hàng', 'canonical' => 'order:update', 'description' => 'Cho phép cập nhật thông tin/trạng thái Đơn Hàng', 'user_id' => 1, 'publish' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Xóa Đơn Hàng', 'canonical' => 'order:delete', 'description' => 'Cho phép xóa Đơn Hàng', 'user_id' => 1, 'publish' => 2, 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($perms as $p) {
            \Illuminate\Support\Facades\DB::table('permissions')->updateOrInsert(['canonical' => $p['canonical']], $p);
        }

        $adminRole = \Illuminate\Support\Facades\DB::table('user_catalogues')->where('id', 1)->first();
        if ($adminRole) {
            $permIds = \Illuminate\Support\Facades\DB::table('permissions')
                ->whereIn('canonical', array_column($perms, 'canonical'))
                ->pluck('id');

            foreach ($permIds as $pid) {
                \Illuminate\Support\Facades\DB::table('user_catalogue_permission')->updateOrInsert(
                    ['user_catalogue_id' => 1, 'permission_id' => $pid]
                );
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $canonicals = ['order:index', 'order:show', 'order:update', 'order:delete'];
        $permIds = \Illuminate\Support\Facades\DB::table('permissions')
            ->whereIn('canonical', $canonicals)
            ->pluck('id');

        \Illuminate\Support\Facades\DB::table('user_catalogue_permission')->whereIn('permission_id', $permIds)->delete();
        \Illuminate\Support\Facades\DB::table('permissions')->whereIn('canonical', $canonicals)->delete();
    }
};
