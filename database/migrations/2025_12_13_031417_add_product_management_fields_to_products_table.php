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
        Schema::table('products', function (Blueprint $table) {
            // Basic Product Info
            $table->string('sku')->unique()->nullable()->after('product_brand_id');
            $table->string('barcode')->nullable()->after('sku');
            $table->string('unit')->default('piece')->after('barcode'); // đơn vị tính
            
            // Pricing - DECIMAL(20,2) to support large VND values & future multi-currency
            $table->decimal('retail_price', 20, 2)->default(0)->after('unit');
            $table->decimal('wholesale_price', 20, 2)->nullable()->after('retail_price');
            
            // Management Type: basic, imei, batch
            $table->enum('management_type', ['basic', 'imei', 'batch'])->default('basic')->after('wholesale_price');
            
            // Inventory Settings
            $table->boolean('track_inventory')->default(true)->after('management_type');
            $table->boolean('allow_negative_stock')->default(false)->after('track_inventory');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'sku',
                'barcode',
                'unit',
                'retail_price',
                'wholesale_price',
                'management_type',
                'track_inventory',
                'allow_negative_stock'
            ]);
        });
    }
};
