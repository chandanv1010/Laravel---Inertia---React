<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Backfill product_variant_id from product_batches table for existing logs
     */
    public function up(): void
    {
        // Update product_variant_id from product_batches table
        DB::statement('
            UPDATE product_batch_stock_logs logs
            INNER JOIN product_batches batches ON logs.product_batch_id = batches.id
            SET logs.product_variant_id = batches.product_variant_id
            WHERE logs.product_variant_id IS NULL
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse - we can't determine which logs were backfilled
        // This is a data migration, not a schema change
    }
};
