<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ImportOrder;
use App\Models\ImportOrderHistory;

class FixImportOrderPaymentHistoryData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import-order:fix-payment-history-data {--dry-run : Chỉ hiển thị thông tin, không cập nhật database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sửa các payment history records thiếu data hoặc data không đúng';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        $this->info('Đang tìm các payment history records thiếu data...');
        
        // Tìm các history records có action = 'payment' nhưng data là NULL hoặc không có amount
        $histories = ImportOrderHistory::where('action', 'payment')
            ->where(function($query) {
                $query->whereNull('data')
                      ->orWhere('data', '[]')
                      ->orWhere('data', '{}');
            })
            ->with('importOrder')
            ->get();
        
        $this->info("Tìm thấy {$histories->count()} history records cần sửa");
        
        if ($histories->count() === 0) {
            $this->info('Không có record nào cần sửa!');
            return 0;
        }
        
        // Nhóm theo import_order_id để lấy thông tin đơn
        $ordersToFix = [];
        foreach ($histories as $history) {
            if ($history->importOrder) {
                $orderId = $history->import_order_id;
                if (!isset($ordersToFix[$orderId])) {
                    $ordersToFix[$orderId] = [
                        'order' => $history->importOrder,
                        'histories' => [],
                    ];
                }
                $ordersToFix[$orderId]['histories'][] = $history;
            }
        }
        
        if ($dryRun) {
            $this->warn('=== DRY RUN MODE - Không cập nhật database ===');
            $this->table(
                ['Order ID', 'Order Code', 'Payment Amount', 'History ID', 'Created At'],
                collect($ordersToFix)->flatMap(function($item) {
                    return collect($item['histories'])->map(function($history) use ($item) {
                        return [
                            $item['order']->id,
                            $item['order']->code ?? 'N/A',
                            number_format($item['order']->payment_amount, 0, ',', '.') . 'đ',
                            $history->id,
                            $history->created_at->format('d/m/Y H:i'),
                        ];
                    });
                })->toArray()
            );
            $this->info('Chạy lại command không có --dry-run để thực hiện sửa.');
            return 0;
        }
        
        $this->info('Bắt đầu sửa payment history data...');
        $bar = $this->output->createProgressBar(count($histories));
        $bar->start();
        
        $fixed = 0;
        $errors = 0;
        
        foreach ($histories as $history) {
            try {
                $order = $history->importOrder;
                if (!$order) {
                    $errors++;
                    $bar->advance();
                    continue;
                }
                
                // Tính toán amount từ payment_amount của đơn
                // Nếu có nhiều history records, chia đều hoặc dùng payment_amount
                $paymentAmount = floatval($order->payment_amount ?? 0);
                $amountToPay = floatval($order->amount_to_pay ?? 0);
                
                // Nếu chỉ có 1 history record, dùng toàn bộ payment_amount
                // Nếu có nhiều, cần tính toán lại (tạm thời dùng payment_amount)
                $amount = $paymentAmount;
                
                $history->data = [
                    'amount' => $amount,
                    'note' => '',
                    'total_paid' => $paymentAmount,
                    'remaining' => max(0, $amountToPay - $paymentAmount),
                ];
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
        
        $this->info("Sửa hoàn tất!");
        $this->info("Thành công: {$fixed} records");
        if ($errors > 0) {
            $this->warn("Lỗi: {$errors} records");
        }
        
        return 0;
    }
}

