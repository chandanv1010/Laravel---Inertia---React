<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $user = DB::table('users')->first();
        $userId = $user ? $user->id : null;

        $permissions = [
            [
                'name' => 'Xem cấu hình hệ thống',
                'canonical' => 'setting:index',
                'publish' => 2,
                'description' => 'Cho phép truy cập các trang cấu hình hệ thống',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Xem cấu hình thuế',
                'canonical' => 'setting_tax:index',
                'publish' => 2,
                'description' => 'Cho phép xem cấu hình thuế',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'Cập nhật cấu hình thuế',
                'canonical' => 'setting_tax:update',
                'publish' => 2,
                'description' => 'Cho phép cập nhật cấu hình thuế',
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
        
        // Gán permissions cho TẤT CẢ user catalogues
        $permissionIds = DB::table('permissions')
            ->whereIn('canonical', ['setting:index', 'setting_tax:index', 'setting_tax:update'])
            ->pluck('id')
            ->toArray();
        
        $userCatalogues = DB::table('user_catalogues')->get();
        
        if (!$userCatalogues->isEmpty()) {
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
                    }
                }
            }
        }
    }
}

