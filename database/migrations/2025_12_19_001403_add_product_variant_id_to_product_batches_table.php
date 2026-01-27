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
            $table->foreignId('product_variant_id')->nullable()->after('product_id')->constrained('product_variants')->onDelete('cascade');
            
            // Drop old unique constraint if exists
            $table->dropUnique(['product_id', 'code']);
            
            // Add new composite unique constraint: batches are unique per product OR per variant
            // MySQL treats NULL as distinct, so (product_id, NULL, code) and (product_id, variant_id, code) can coexist
            $table->unique(['product_id', 'product_variant_id', 'code'], 'product_batches_unique_code');
            
            // Add index for variant batches
            $table->index(['product_variant_id', 'is_default']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_batches', function (Blueprint $table) {
            $table->dropUnique('product_batches_unique_code');
            $table->dropIndex(['product_variant_id', 'is_default']);
            $table->dropForeign(['product_variant_id']);
            $table->dropColumn('product_variant_id');
            
            // Restore old unique constraint
            $table->unique(['product_id', 'code']);
        });
    }
};
