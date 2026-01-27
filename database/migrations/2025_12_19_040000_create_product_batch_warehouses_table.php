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
        Schema::create('product_batch_warehouses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_batch_id')->constrained('product_batches')->onDelete('cascade');
            $table->foreignId('warehouse_id')->constrained('warehouses')->onDelete('cascade');
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->timestamps();

            $table->unique(['product_batch_id', 'warehouse_id']);
            $table->index(['product_batch_id', 'warehouse_id']);
            $table->index(['warehouse_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_batch_warehouses');
    }
};
