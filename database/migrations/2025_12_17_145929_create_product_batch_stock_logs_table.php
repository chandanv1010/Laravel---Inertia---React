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
        Schema::create('product_batch_stock_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_batch_id');
            $table->unsignedBigInteger('product_id')->nullable();
            $table->unsignedBigInteger('warehouse_id')->nullable();
            $table->integer('before_stock')->default(0);
            $table->integer('change_stock')->default(0); // positive/negative
            $table->integer('after_stock')->default(0);
            $table->string('reason')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();

            $table->index(['product_batch_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_batch_stock_logs');
    }
};
