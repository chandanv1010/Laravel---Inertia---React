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
        Schema::create('product_variant_warehouse_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->onDelete('cascade');
            $table->foreignId('warehouse_id')->constrained('warehouses')->onDelete('cascade');
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->string('storage_location')->nullable();
            $table->timestamps();

            $table->unique(['product_variant_id', 'warehouse_id'], 'pvw_stocks_variant_warehouse_unique');
            $table->index(['product_variant_id', 'warehouse_id'], 'pvw_stocks_variant_warehouse_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variant_warehouse_stocks');
    }
};
