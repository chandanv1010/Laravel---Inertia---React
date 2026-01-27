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
        Schema::table('product_batches', function (Blueprint $table) {
            // Drop unique constraint cũ (có warehouse_id)
            $table->dropUnique('product_batches_unique_code_warehouse');
            
            // Drop foreign key và columns
            $table->dropForeign(['warehouse_id']);
            $table->dropColumn(['warehouse_id', 'stock_quantity']);
            
            // Thêm unique constraint mới (không có warehouse_id)
            // 1 batch code chỉ tồn tại 1 lần cho mỗi product/variant
            $table->unique(['product_id', 'product_variant_id', 'code'], 'product_batches_unique_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_batches', function (Blueprint $table) {
            // Drop unique constraint mới
            $table->dropUnique('product_batches_unique_code');
            
            // Thêm lại columns
            $table->foreignId('warehouse_id')->nullable()->after('expired_at')->constrained('warehouses')->nullOnDelete();
            $table->unsignedInteger('stock_quantity')->default(0)->after('warehouse_id');
            
            // Thêm lại unique constraint cũ
            $table->unique(['product_id', 'product_variant_id', 'code', 'warehouse_id'], 'product_batches_unique_code_warehouse');
        });
    }
};
