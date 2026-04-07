<?php

use App\Models\Permission;
use Illuminate\Support\Facades\DB;

$perms = [
    [
        'name' => 'Xem danh sách Đơn Hàng',
        'canonical' => 'order:index',
        'description' => 'Cho phép xem danh sách Đơn Hàng',
        'user_id' => 1,
        'publish' => 2
    ],
    [
        'name' => 'Xem chi tiết Đơn Hàng',
        'canonical' => 'order:show',
        'description' => 'Cho phép xem chi tiết Đơn Hàng',
        'user_id' => 1,
        'publish' => 2
    ],
    [
        'name' => 'Cập nhật Đơn Hàng',
        'canonical' => 'order:update',
        'description' => 'Cho phép cập nhật thông tin/trạng thái Đơn Hàng',
        'user_id' => 1,
        'publish' => 2
    ],
    [
        'name' => 'Xóa Đơn Hàng',
        'canonical' => 'order:delete',
        'description' => 'Cho phép xóa Đơn Hàng',
        'user_id' => 1,
        'publish' => 2
    ],
];

echo "Creating permissions...\n";
foreach ($perms as $p) {
    Permission::updateOrCreate(['canonical' => $p['canonical']], $p);
}

$adminRole = DB::table('user_catalogues')->where('id', 1)->first();
if ($adminRole) {
    echo "Assigning permissions to Administrator role (ID 1)...\n";
    $permIds = Permission::whereIn('canonical', array_column($perms, 'canonical'))->pluck('id')->toArray();
    foreach ($permIds as $pid) {
        DB::table('user_catalogue_permission')->updateOrInsert(
            ['user_catalogue_id' => 1, 'permission_id' => $pid]
        );
    }
    echo "Success: Permissions created and assigned.\n";
} else {
    echo "Error: Administrator role (ID 1) not found.\n";
}
