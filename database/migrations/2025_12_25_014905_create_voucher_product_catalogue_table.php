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
        Schema::create('voucher_product_catalogue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_id')->constrained('vouchers')->onDelete('cascade');
            $table->foreignId('product_catalogue_id')->constrained('product_catalogues')->onDelete('cascade');
            $table->timestamps();
            
            // Unique constraint để tránh duplicate
            $table->unique(['voucher_id', 'product_catalogue_id'], 'voucher_product_catalogue_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('voucher_product_catalogue');
    }
};
