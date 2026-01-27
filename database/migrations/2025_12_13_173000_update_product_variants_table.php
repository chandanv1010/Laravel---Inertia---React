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
            if (!Schema::hasColumn('product_variants', 'compare_price')) {
                $table->decimal('compare_price', 15, 2)->nullable()->after('retail_price');
            }
            if (!Schema::hasColumn('product_variants', 'cost_price')) {
                $table->decimal('cost_price', 15, 2)->nullable()->after('retail_price'); // simplified position
            }
            if (!Schema::hasColumn('product_variants', 'album')) {
                $table->json('album')->nullable()->after('image');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn(['compare_price', 'cost_price', 'album']);
        });
    }
};
