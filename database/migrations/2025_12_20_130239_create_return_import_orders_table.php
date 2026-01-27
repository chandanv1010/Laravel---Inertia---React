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
        Schema::create('return_import_orders', function (Blueprint $table) {
            $table->id();
            $table->decimal('deduction', 15, 2)->default(0);
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->decimal('return_cost', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('return_import_orders');
    }
};
