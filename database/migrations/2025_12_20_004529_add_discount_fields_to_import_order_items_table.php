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
        Schema::table('import_order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('import_order_items', 'discount')) {
                $table->decimal('discount', 20, 2)->default(0)->after('unit_price');
            }
            if (!Schema::hasColumn('import_order_items', 'discount_type')) {
                $table->enum('discount_type', ['amount', 'percent'])->default('amount')->after('discount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('import_order_items', function (Blueprint $table) {
            $table->dropColumn(['discount', 'discount_type']);
        });
    }
};
