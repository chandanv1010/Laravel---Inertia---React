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
        // Add 'free' to discount_type enum for buy_x_get_y promotions
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE promotions MODIFY COLUMN discount_type ENUM('fixed_amount', 'percentage', 'same_price', 'free') NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to previous enum values
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE promotions MODIFY COLUMN discount_type ENUM('fixed_amount', 'percentage', 'same_price') NULL");
    }
};
