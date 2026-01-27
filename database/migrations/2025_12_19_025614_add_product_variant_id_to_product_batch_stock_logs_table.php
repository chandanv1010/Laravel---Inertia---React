<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('product_batch_stock_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('product_variant_id')->nullable()->after('product_id');
            $table->index(['product_variant_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_batch_stock_logs', function (Blueprint $table) {
            $table->dropIndex(['product_variant_id', 'created_at']);
            $table->dropColumn('product_variant_id');
        });
    }
};
