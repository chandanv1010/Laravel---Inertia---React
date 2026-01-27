<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ImportOrderHistory;

class RemoveAutoSyncNotes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import-order:remove-auto-notes {--dry-run : Chỉ hiển thị thông tin, không cập nhật database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Xóa các note tự động (Đã sửa tự động, Đồng bộ tự động từ payment_amount) khỏi payment history';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        $this->info('Đang tìm các payment history records có note tự động...');
        
        // Tìm các history records có action = 'payment' và có note tự động
        $histories = ImportOrderHistory::where('action', 'payment')
            ->get()
            ->filter(function($history) {
                $data = is_array($history->data) ? $history->data : (is_string($history->data) ? json_decode($history->data, true) : []);
                $note = $data['note'] ?? '';
                return !empty($note) && (
                    str_contains($note, 'Đã sửa tự động') || 
                    str_contains($note, 'Đồng bộ tự động') ||
                    str_contains($note, 'sửa tự động') ||
                    str_contains($note, 'đồng bộ tự động')
                );
            });
        
        $this->info("Tìm thấy {$histories->count()} history records có note tự động");
        
        if ($histories->count() === 0) {
            $this->info('Không có record nào cần sửa!');
            return 0;
        }
        
        if ($dryRun) {
            $this->warn('=== DRY RUN MODE - Không cập nhật database ===');
            $this->table(
                ['History ID', 'Order ID', 'Note', 'Amount'],
                $histories->map(function($history) {
                    $data = is_array($history->data) ? $history->data : (is_string($history->data) ? json_decode($history->data, true) : []);
                    return [
                        $history->id,
                        $history->import_order_id,
                        $data['note'] ?? 'N/A',
                        number_format($data['amount'] ?? 0, 0, ',', '.') . 'đ',
                    ];
                })->toArray()
            );
            $this->info('Chạy lại command không có --dry-run để thực hiện xóa note.');
            return 0;
        }
        
        $this->info('Bắt đầu xóa note tự động...');
        $bar = $this->output->createProgressBar($histories->count());
        $bar->start();
        
        $fixed = 0;
        $errors = 0;
        
        foreach ($histories as $history) {
            try {
                $data = is_array($history->data) ? $history->data : (is_string($history->data) ? json_decode($history->data, true) : []);
                
                // Xóa note
                $data['note'] = '';
                
                $history->data = $data;
                $history->save();
                
                $fixed++;
            } catch (\Exception $e) {
                $this->error("\nLỗi khi sửa history #{$history->id}: " . $e->getMessage());
                $errors++;
            }
            
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine(2);
        
        $this->info("Xóa note hoàn tất!");
        $this->info("Thành công: {$fixed} records");
        if ($errors > 0) {
            $this->warn("Lỗi: {$errors} records");
        }
        
        return 0;
    }
}

