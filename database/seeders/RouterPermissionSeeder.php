<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RouterPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lấy user đầu tiên hoặc null
        $user = DB::table('users')->first();
        $userId = $user ? $user->id : null;

        $permissions = [
            [
                'name' => 'Xem danh sách Router',
                'canonical' => 'router:index',
                'publish' => 2,
                'description' => 'Cho phép xem danh sách router',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
        ];

        // Insert permissions nếu chưa tồn tại
        foreach ($permissions as $permission) {
            DB::table('permissions')->updateOrInsert(
                ['canonical' => $permission['canonical']],
                $permission
            );
        }
        
        // Lấy các permission IDs vừa tạo
        $permissionIds = DB::table('permissions')
            ->whereIn('canonical', ['router:index'])
            ->pluck('id')
            ->toArray();
        
        // Gán permissions cho TẤT CẢ user catalogues để đảm bảo ai cũng có quyền xem router
        $userCatalogues = DB::table('user_catalogues')->get();
        
        if ($userCatalogues->isEmpty()) {
            $this->command->warn('Không tìm thấy user catalogue nào. Vui lòng tạo user catalogue trước.');
            return;
        }
        
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
            $this->command->info("Đã gán {$assignedCount} router permissions cho " . $userCatalogues->count() . " user catalogue(s).");
        } else {
            $this->command->info('Tất cả user catalogues đã có router permissions.');
        }
    }
}
