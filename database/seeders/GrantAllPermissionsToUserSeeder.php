<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\User;
use App\Models\UserCatalogue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Database\Seeders\SettingPermissionSeeder;

class GrantAllPermissionsToUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('GRANT_PERMS_EMAIL', 'chandanv1010@gmail.com');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->command->error("❌ Không tìm thấy user với email: {$email}");
            return;
        }

        // Use (or create) a dedicated super-admin catalogue
        $catalogue = UserCatalogue::firstOrCreate(
            ['canonical' => 'super_admin'],
            [
                'name' => 'Super Admin',
                'description' => 'Auto-created by GrantAllPermissionsToUserSeeder',
                'publish' => 2,
                'user_id' => $user->id,
            ]
        );

        DB::beginTransaction();
        try {
            // Ensure required permissions exist (including newly added modules)
            $this->call([
                SettingPermissionSeeder::class,
            ]);

            // Attach user to this catalogue
            $catalogue->users()->syncWithoutDetaching([$user->id]);

            // Attach ALL permissions to this catalogue
            $permissionIds = Permission::query()->pluck('id')->toArray();
            $catalogue->permissions()->sync($permissionIds);

            // Ensure user is active (publish != 1)
            if ((int)($user->publish ?? 0) === 1) {
                $user->publish = 2;
                $user->save();
            }

            DB::commit();
            $this->command->info("✅ Đã cấp TẤT CẢ permissions cho user {$email} (UserCatalogue: {$catalogue->canonical})");
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->command->error('❌ Có lỗi xảy ra: ' . $e->getMessage());
            throw $e;
        }
    }
}

