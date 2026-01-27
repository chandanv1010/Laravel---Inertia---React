<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ReturnImportOrder;
use Illuminate\Support\Facades\DB;

class CheckRefundStatus extends Command
{
    protected $signature = 'check:refund-status {id?}';
    protected $description = 'Check refund status of return import order';

    public function handle()
    {
        $id = $this->argument('id') ?? 8;
        
        $this->info("=== Checking Return Import Order ID: {$id} ===");
        
        // Check via Eloquent
        $order = ReturnImportOrder::find($id);
        
        if (!$order) {
            $this->error("Order not found!");
            return 1;
        }
        
        $this->info("\n--- Eloquent Model ---");
        $this->info("Code: " . $order->code);
        $this->info("Status: " . $order->status);
        $this->info("Refund Status: " . ($order->refund_status ?? 'NULL'));
        $this->info("Refund Amount: " . $order->refund_amount);
        $this->info("Updated At: " . $order->updated_at);
        
        // Check raw database
        $raw = DB::table('return_import_orders')->where('id', $id)->first();
        
        if ($raw) {
            $this->info("\n--- Raw Database ---");
            $this->info("refund_status (raw): " . ($raw->refund_status ?? 'NULL'));
            $this->info("status (raw): " . ($raw->status ?? 'NULL'));
            $this->info("refund_amount (raw): " . ($raw->refund_amount ?? 'NULL'));
            $this->info("updated_at (raw): " . ($raw->updated_at ?? 'NULL'));
        }
        
        return 0;
    }
}
