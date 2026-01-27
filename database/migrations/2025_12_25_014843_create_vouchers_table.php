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
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('code')->unique()->comment('Mã voucher');
            $table->string('name');
            $table->enum('type', ['order_discount', 'product_discount', 'buy_x_get_y', 'free_shipping'])->default('order_discount');
            $table->enum('discount_type', ['fixed_amount', 'percentage'])->nullable();
            $table->decimal('discount_value', 15, 2)->nullable();
            $table->decimal('max_discount_value', 15, 2)->nullable();
            $table->decimal('combo_price', 15, 2)->nullable()->comment('Giá combo cố định cho type = combo');
            $table->enum('condition_type', ['none', 'min_order_amount', 'min_product_quantity'])->default('none');
            $table->decimal('condition_value', 15, 2)->nullable();
            $table->enum('customer_group_type', ['all', 'selected'])->default('all');
            $table->enum('store_type', ['all', 'selected'])->default('all');
            $table->enum('apply_source', ['all', 'product_variant', 'product_catalogue'])->default('all');
            $table->boolean('combine_with_order_discount')->default(false);
            $table->boolean('combine_with_product_discount')->default(false);
            $table->boolean('combine_with_free_shipping')->default(false);
            $table->integer('usage_limit')->nullable()->comment('Giới hạn số lần sử dụng tổng (null = không giới hạn)');
            $table->integer('usage_count')->default(0)->comment('Số lần đã sử dụng');
            $table->boolean('limit_per_customer')->default(false)->comment('Giới hạn mỗi khách hàng chỉ dùng 1 lần');
            $table->dateTime('start_date');
            $table->dateTime('end_date')->nullable();
            $table->boolean('no_end_date')->default(false);
            $table->integer('order')->default(0);
            $table->enum('publish', [1, 2])->default(2);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
            
            // Index cho code để tìm kiếm nhanh
            $table->index('code');
            $table->index('type');
            $table->index('publish');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vouchers');
    }
};
