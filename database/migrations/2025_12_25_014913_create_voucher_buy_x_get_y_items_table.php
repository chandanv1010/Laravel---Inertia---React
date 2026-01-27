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
        Schema::create('voucher_buy_x_get_y_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_id')->constrained('vouchers')->onDelete('cascade');
            $table->enum('item_type', ['buy', 'get']); // 'buy' cho Mua X, 'get' cho Tặng Y
            $table->enum('apply_type', ['product', 'product_variant', 'product_catalogue']); // Áp dụng cho sản phẩm, variant, hay danh mục
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('cascade');
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->onDelete('cascade');
            $table->foreignId('product_catalogue_id')->nullable()->constrained('product_catalogues')->onDelete('cascade');
            $table->integer('quantity')->default(1); // Số lượng cho buy (tối thiểu) hoặc get
            $table->decimal('min_order_value', 15, 2)->nullable(); // Giá trị đơn hàng tối thiểu (cho buy)
            $table->timestamps();
            
            // Index để query nhanh
            $table->index(['voucher_id', 'item_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('voucher_buy_x_get_y_items');
    }
};
