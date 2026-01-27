<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class CKFinderPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::first();
        $userId = $user ? $user->id : 1;

        $permissions = [
            [
                'name' => 'CKFinder - Tất cả quyền',
                'canonical' => 'ckfinder:all',
                'publish' => 2,
                'description' => 'Cho phép tất cả quyền trong CKFinder',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'CKFinder - Xem thư mục',
                'canonical' => 'ckfinder:folderView',
                'publish' => 2,
                'description' => 'Cho phép xem danh sách thư mục trong CKFinder',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'CKFinder - Tạo thư mục',
                'canonical' => 'ckfinder:folderCreate',
                'publish' => 2,
                'description' => 'Cho phép tạo thư mục mới trong CKFinder',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'CKFinder - Đổi tên thư mục',
                'canonical' => 'ckfinder:folderRename',
                'publish' => 2,
                'description' => 'Cho phép đổi tên thư mục trong CKFinder',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'CKFinder - Xóa thư mục',
                'canonical' => 'ckfinder:folderDelete',
                'publish' => 2,
                'description' => 'Cho phép xóa thư mục trong CKFinder',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'CKFinder - Xem file',
                'canonical' => 'ckfinder:fileView',
                'publish' => 2,
                'description' => 'Cho phép xem danh sách file trong CKFinder',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'CKFinder - Upload file',
                'canonical' => 'ckfinder:fileUpload',
                'publish' => 2,
                'description' => 'Cho phép upload file lên CKFinder',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'CKFinder - Đổi tên file',
                'canonical' => 'ckfinder:fileRename',
                'publish' => 2,
                'description' => 'Cho phép đổi tên file trong CKFinder',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
            [
                'name' => 'CKFinder - Xóa file',
                'canonical' => 'ckfinder:fileDelete',
                'publish' => 2,
                'description' => 'Cho phép xóa file trong CKFinder',
                'created_at' => now(),
                'updated_at' => now(),
                'user_id' => $userId,
            ],
        ];

        DB::beginTransaction();
        try {
            foreach ($permissions as $permission) {
                DB::table('permissions')->updateOrInsert(
                    ['canonical' => $permission['canonical']],
                    $permission
                );
            }

            DB::commit();
            $this->command->info('✅ Đã tạo permissions cho CKFinder thành công!');
        } catch (\Throwable $th) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $th->getMessage());
            throw $th;
        }
    }
}
