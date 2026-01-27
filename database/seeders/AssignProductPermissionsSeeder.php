<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\UserCatalogue;

class AssignProductPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lấy user đầu tiên
        $user = User::first();
        if (!$user) {
            $this->command->warn('Không tìm thấy user nào!');
            return;
        }

        // Lấy UserCatalogue của user (thường là admin)
        $userCatalogues = $user->user_catalogues;
        if ($userCatalogues->isEmpty()) {
            // Nếu user chưa có UserCatalogue, lấy UserCatalogue đầu tiên hoặc tạo mới
            $userCatalogue = UserCatalogue::first();
            if (!$userCatalogue) {
                $this->command->warn('Không tìm thấy UserCatalogue nào! Vui lòng tạo UserCatalogue trước.');
                return;
            }
            $userCatalogues = collect([$userCatalogue]);
        }

        // Lấy tất cả Product permissions
        $productPermissions = DB::table('permissions')
            ->whereIn('canonical', [
                'product_catalogue:index',
                'product_catalogue:store',
                'product_catalogue:update',
                'product_catalogue:delete',
                'product_catalogue:bulkDestroy',
                'product_catalogue:bulkUpdate',
                'product:index',
                'product:store',
                'product:update',
                'product:delete',
                'product:bulkDestroy',
                'product:bulkUpdate',
                'product_brand:index',
                'product_brand:store',
                'product_brand:update',
                'product_brand:delete',
                'product_brand:bulkDestroy',
                'product_brand:bulkUpdate',
                'product_variant:index',
                'product_variant:store',
                'product_variant:update',
                'product_variant:delete',
                'product_variant:bulkDestroy',
                'product_variant:bulkUpdate',
                'product_batch:index',
                'product_batch:store',
                'product_batch:update',
                'product_batch:delete',
                'product_batch:bulkDestroy',
                'product_batch:bulkUpdate',
            ])
            ->pluck('id')
            ->toArray();

        if (empty($productPermissions)) {
            $this->command->warn('Không tìm thấy Product permissions nào! Vui lòng chạy ProductPermissionSeeder trước.');
            return;
        }

        DB::beginTransaction();
        try {
            foreach ($userCatalogues as $userCatalogue) {
                // Gán tất cả permissions cho user_catalogue
                $existingPermissions = DB::table('user_catalogue_permission')
                    ->where('user_catalogue_id', $userCatalogue->id)
                    ->pluck('permission_id')
                    ->toArray();

                $newPermissions = array_diff($productPermissions, $existingPermissions);

                if (!empty($newPermissions)) {
                    $insertData = array_map(function ($permissionId) use ($userCatalogue) {
                        return [
                            'user_catalogue_id' => $userCatalogue->id,
                            'permission_id' => $permissionId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }, $newPermissions);

                    DB::table('user_catalogue_permission')->insert($insertData);
                    $this->command->info("✅ Đã gán " . count($newPermissions) . " permissions cho UserCatalogue: {$userCatalogue->name} (ID: {$userCatalogue->id})");
                } else {
                    $this->command->info("ℹ️  UserCatalogue: {$userCatalogue->name} (ID: {$userCatalogue->id}) đã có đầy đủ permissions.");
                }
            }

            DB::commit();
            $this->command->info('✅ Đã gán Product permissions thành công!');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}

