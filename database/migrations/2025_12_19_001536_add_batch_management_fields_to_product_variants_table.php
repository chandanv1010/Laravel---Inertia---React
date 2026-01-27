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
        Schema::table('product_variants', function (Blueprint $table) {
            // Management type: basic, imei, batch
            $table->enum('management_type', ['basic', 'imei', 'batch'])->default('batch')->nullable()->after('expiry_date');
            
            // Inventory settings
            $table->boolean('track_inventory')->default(true)->after('management_type');
            $table->boolean('allow_negative_stock')->default(false)->after('track_inventory');
            $table->integer('low_stock_alert')->default(0)->after('allow_negative_stock');
            
            // Expired warning days
            $table->integer('expired_warning_days')->default(1)->nullable()->after('low_stock_alert');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn([
                'management_type',
                'track_inventory',
                'allow_negative_stock',
                'low_stock_alert',
                'expired_warning_days'
            ]);
        });
    }
};
