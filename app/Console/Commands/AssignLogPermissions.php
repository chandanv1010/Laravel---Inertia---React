<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AssignLogPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'log:assign-permissions {--catalogue-id= : User Catalogue ID để gán permissions}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Gán log permissions cho user catalogues';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Lấy các log permission IDs
        $permissionIds = DB::table('permissions')
            ->whereIn('canonical', ['log:index', 'log:delete', 'log:refresh-cache'])
            ->pluck('id')
            ->toArray();

        if (empty($permissionIds)) {
            $this->error('Không tìm thấy log permissions. Vui lòng chạy: php artisan db:seed --class=LogPermissionSeeder');
            return 1;
        }

        $this->info('Tìm thấy ' . count($permissionIds) . ' log permissions: ' . implode(', ', $permissionIds));

        $catalogueId = $this->option('catalogue-id');

        if ($catalogueId) {
            // Gán cho một catalogue cụ thể
            $catalogue = DB::table('user_catalogues')->find($catalogueId);
            if (!$catalogue) {
                $this->error("Không tìm thấy user catalogue với ID: {$catalogueId}");
                return 1;
            }

            $this->assignToCatalogue($catalogue->id, $permissionIds, $catalogue->name);
        } else {
            // Gán cho tất cả catalogues
            $catalogues = DB::table('user_catalogues')->get();
            
            if ($catalogues->isEmpty()) {
                $this->error('Không tìm thấy user catalogue nào.');
                return 1;
            }

            $this->info('Gán permissions cho ' . $catalogues->count() . ' user catalogue(s)...');

            foreach ($catalogues as $catalogue) {
                $this->assignToCatalogue($catalogue->id, $permissionIds, $catalogue->name);
            }
        }

        $this->info('Hoàn thành! Vui lòng clear cache: php artisan cache:clear');
        
        return 0;
    }

    private function assignToCatalogue($catalogueId, $permissionIds, $catalogueName)
    {
        $assignedCount = 0;
        foreach ($permissionIds as $permissionId) {
            $exists = DB::table('user_catalogue_permission')
                ->where('user_catalogue_id', $catalogueId)
                ->where('permission_id', $permissionId)
                ->exists();

            if (!$exists) {
                DB::table('user_catalogue_permission')->insert([
                    'user_catalogue_id' => $catalogueId,
                    'permission_id' => $permissionId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $assignedCount++;
            }
        }

        if ($assignedCount > 0) {
            $this->line("  ✓ Đã gán {$assignedCount} permissions cho: {$catalogueName} (ID: {$catalogueId})");
        } else {
            $this->line("  - {$catalogueName} (ID: {$catalogueId}) đã có đầy đủ permissions");
        }
    }
}

