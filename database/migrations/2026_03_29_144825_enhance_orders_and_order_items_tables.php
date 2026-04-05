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
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('subtotal', 15, 2)->after('total_amount')->default(0);
            $table->decimal('discount_total', 15, 2)->after('subtotal')->default(0);
            $table->decimal('voucher_discount', 15, 2)->after('discount_total')->default(0);
            $table->decimal('shipping_fee', 15, 2)->after('voucher_discount')->default(0);
            $table->json('summary_snapshot')->after('notes')->nullable();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('type')->after('variant_id')->default('standard'); // standard, combo_item, reward
            $table->bigInteger('parent_id')->after('type')->nullable();
            $table->string('combo_group_id')->after('parent_id')->nullable();
            $table->decimal('original_price', 15, 2)->after('price')->default(0);
            $table->json('promotions_snapshot')->after('total')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
