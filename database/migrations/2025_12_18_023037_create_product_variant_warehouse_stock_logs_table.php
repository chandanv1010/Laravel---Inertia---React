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
        Schema::create('product_variant_warehouse_stock_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->onDelete('cascade');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->integer('before_stock')->default(0);
            $table->integer('change_stock')->default(0); // positive/negative
            $table->integer('after_stock')->default(0);
            $table->string('reason')->nullable();
            $table->string('transaction_type')->default('variant');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();

            $table->index(['product_variant_id', 'warehouse_id', 'created_at'], 'pvw_logs_variant_warehouse_created_idx');
            $table->index(['product_variant_id', 'created_at'], 'pvw_logs_variant_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variant_warehouse_stock_logs');
    }
};
