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
        Schema::dropIfExists('import_order_items');
        Schema::create('import_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_order_id')->constrained('import_orders')->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null');
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->onDelete('set null');
            $table->integer('quantity')->default(0);
            $table->decimal('unit_price', 20, 2)->default(0);
            $table->decimal('total_price', 20, 2)->default(0);
            $table->text('notes')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_order_items');
    }
};
