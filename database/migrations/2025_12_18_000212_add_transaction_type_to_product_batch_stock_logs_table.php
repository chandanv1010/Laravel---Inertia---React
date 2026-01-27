<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('product_batch_stock_logs', function (Blueprint $table) {
            $table->string('transaction_type')->default('product')->after('user_id');
        });
        
        // Update existing records to have transaction_type = 'product'
        DB::table('product_batch_stock_logs')->update(['transaction_type' => 'product']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_batch_stock_logs', function (Blueprint $table) {
            $table->dropColumn('transaction_type');
        });
    }
};
