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
        Schema::table('product_batches', function (Blueprint $table) {
            // Drop old unique constraint
            $table->dropUnique('product_batches_unique_code');
            
            // Add new unique constraint including warehouse_id
            // This allows the same batch code to exist in different warehouses
            $table->unique(['product_id', 'product_variant_id', 'code', 'warehouse_id'], 'product_batches_unique_code_warehouse');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_batches', function (Blueprint $table) {
            // Drop new unique constraint
            $table->dropUnique('product_batches_unique_code_warehouse');
            
            // Restore old unique constraint
            $table->unique(['product_id', 'product_variant_id', 'code'], 'product_batches_unique_code');
        });
    }
};
