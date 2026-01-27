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
        Schema::create('voucher_customer_group', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_id')->constrained('vouchers')->onDelete('cascade');
            $table->foreignId('customer_catalogue_id')->constrained('customer_catalogues')->onDelete('cascade');
            $table->timestamps();
            
            // Unique constraint để tránh duplicate
            $table->unique(['voucher_id', 'customer_catalogue_id'], 'voucher_customer_group_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('voucher_customer_group');
    }
};
