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
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->string('sku')->unique();
            $table->decimal('wholesale_price', 15, 2)->nullable();
            $table->decimal('retail_price', 15, 2)->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->boolean('is_default')->default(false);
            $table->string('image')->nullable();
            $table->integer('order')->default(0);
            $table->enum('publish', [1,2])->default(2);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
            
            // Index for faster queries
            $table->index('product_id');
            $table->index('is_default');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
