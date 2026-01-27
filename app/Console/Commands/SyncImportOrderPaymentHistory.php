<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ImportOrder;
use App\Models\ImportOrderHistory;

class SyncImportOrderPaymentHistory extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import-order:sync-payment-history {--dry-run : Chỉ hiển thị thông tin, không cập nhật database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Đồng bộ payment history cho các đơn nhập có payment_amount nhưng thiếu history record';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        $this->info('Đang tìm các đơn nhập có payment_amount nhưng thiếu payment history...');
        
        // Tìm các đơn nhập có payment_amount > 0
        $ordersWithPayment = ImportOrder::where('payment_amount', '>', 0)
            ->get();
        
        $this->info("Tìm thấy {$ordersWithPayment->count()} đơn có payment_amount > 0");
        
        $missingHistory = [];
        $hasHistory = [];
        
        foreach ($ordersWithPayment as $order) {
            // Kiểm tra xem có history record với action = 'payment' không
            $paymentHistory = ImportOrderHistory::where('import_order_id', $order->id)
                ->where('action', 'payment')
                ->exists();
            
            if (!$paymentHistory) {
                $missingHistory[] = $order;
            } else {
                $hasHistory[] = $order;
            }
        }
        
        $this->info("Đơn có payment history: " . count($hasHistory));
        $this->info("Đơn thiếu payment history: " . count($missingHistory));
        
        if (count($missingHistory) === 0) {
            $this->info('Không có đơn nào cần đồng bộ!');
            return 0;
        }
        
        if ($dryRun) {
            $this->warn('=== DRY RUN MODE - Không cập nhật database ===');
            $this->table(
                ['ID', 'Code', 'Payment Amount', 'Amount To Pay', 'Payment Status', 'Payment Date'],
                collect($missingHistory)->map(function($order) {
                    return [
                        $order->id,
                        $order->code ?? 'N/A',
                        number_format($order->payment_amount, 0, ',', '.') . 'đ',
                        number_format($order->amount_to_pay, 0, ',', '.') . 'đ',
                        $order->payment_status ?? 'N/A',
                        $order->payment_date ? $order->payment_date->format('d/m/Y') : 'N/A',
                    ];
                })->toArray()
            );
            $this->info('Chạy lại command không có --dry-run để thực hiện đồng bộ.');
            return 0;
        }
        
        $this->info('Bắt đầu đồng bộ payment history...');
        $bar = $this->output->createProgressBar(count($missingHistory));
        $bar->start();
        
        $synced = 0;
        $errors = 0;
        
        foreach ($missingHistory as $order) {
            try {
                // Tạo history record dựa trên payment_amount hiện tại
                // Sử dụng payment_date nếu có, nếu không dùng updated_at
                $paymentDate = $order->payment_date ?? $order->updated_at ?? now();
                
                ImportOrderHistory::create([
                    'import_order_id' => $order->id,
                    'user_id' => $order->user_id ?? 1, // Sử dụng user_id của đơn hoặc user mặc định
                    'action' => 'payment',
                    'description' => "Đồng bộ thanh toán cho đơn nhập hàng {$order->code}",
                    'data' => [
                        'amount' => floatval($order->payment_amount),
                        'note' => '',
                        'total_paid' => floatval($order->payment_amount),
                        'remaining' => max(0, floatval($order->amount_to_pay) - floatval($order->payment_amount)),
                    ],
                    'created_at' => $paymentDate,
                    'updated_at' => $paymentDate,
                ]);
                
                $synced++;
            } catch (\Exception $e) {
                $this->error("\nLỗi khi đồng bộ đơn #{$order->id} ({$order->code}): " . $e->getMessage());
                $errors++;
            }
            
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine(2);
        
        $this->info("Đồng bộ hoàn tất!");
        $this->info("Thành công: {$synced} đơn");
        if ($errors > 0) {
            $this->warn("Lỗi: {$errors} đơn");
        }
        
        return 0;
    }
}

