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
            // Foreign key cho product_batch_id - restrict để giữ log khi xóa batch
            $table->foreign('product_batch_id')
                ->references('id')
                ->on('product_batches')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            // Foreign key cho product_variant_id - nullOnDelete để giữ log khi xóa variant
            $table->foreign('product_variant_id')
                ->references('id')
                ->on('product_variants')
                ->onDelete('set null')
                ->onUpdate('cascade');

            // Foreign key cho warehouse_id - nullOnDelete vì đã nullable
            $table->foreign('warehouse_id')
                ->references('id')
                ->on('warehouses')
                ->onDelete('set null')
                ->onUpdate('cascade');

            // Foreign key cho user_id - nullOnDelete vì đã nullable
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null')
                ->onUpdate('cascade');

            // Note: product_id không thêm foreign key vì Product có SoftDeletes
            // và trong logging tables thường không cascade để giữ lại lịch sử
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_batch_stock_logs', function (Blueprint $table) {
            $table->dropForeign(['product_batch_id']);
            $table->dropForeign(['product_variant_id']);
            $table->dropForeign(['warehouse_id']);
            $table->dropForeign(['user_id']);
        });
    }
};
