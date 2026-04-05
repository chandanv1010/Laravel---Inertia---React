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
        Schema::table('product_warehouse_stocks', function (Blueprint $table) {
            $table->integer('stock_quantity')->unsigned(false)->default(0)->change();
        });

        Schema::table('product_variant_warehouse_stocks', function (Blueprint $table) {
            $table->integer('stock_quantity')->unsigned(false)->default(0)->change();
        });

        Schema::table('product_batch_warehouses', function (Blueprint $table) {
            $table->integer('stock_quantity')->unsigned(false)->default(0)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_warehouse_stocks', function (Blueprint $table) {
            $table->integer('stock_quantity')->unsigned(true)->default(0)->change();
        });

        Schema::table('product_variant_warehouse_stocks', function (Blueprint $table) {
            $table->integer('stock_quantity')->unsigned(true)->default(0)->change();
        });

        Schema::table('product_batch_warehouses', function (Blueprint $table) {
            $table->integer('stock_quantity')->unsigned(true)->default(0)->change();
        });
    }
};
