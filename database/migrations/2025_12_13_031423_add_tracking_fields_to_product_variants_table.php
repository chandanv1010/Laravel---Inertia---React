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
            // Barcode for variant
            $table->string('barcode')->nullable()->after('sku');
            
            // IMEI/Series tracking
            $table->string('imei')->nullable()->after('barcode');
            $table->string('serial_number')->nullable()->after('imei');
            
            // Batch/Expiry tracking
            $table->string('batch_number')->nullable()->after('serial_number');
            $table->date('expiry_date')->nullable()->after('batch_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn([
                'barcode',
                'imei',
                'serial_number',
                'batch_number',
                'expiry_date'
            ]);
        });
    }
};
