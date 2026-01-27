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
        Schema::table('promotion_product_variant', function (Blueprint $table) {
            // Drop foreign key constraint trước khi thay đổi column
            $table->dropForeign(['product_variant_id']);
        });
        
        // Sử dụng raw SQL để thay đổi column vì Laravel schema builder có thể không xử lý tốt foreign key nullable
        \Illuminate\Support\Facades\DB::statement("
            ALTER TABLE promotion_product_variant 
            MODIFY COLUMN product_variant_id BIGINT UNSIGNED NULL
        ");
        
        // Tạo lại foreign key constraint với nullable
        Schema::table('promotion_product_variant', function (Blueprint $table) {
            $table->foreign('product_variant_id')
                ->references('id')
                ->on('product_variants')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Xóa dữ liệu null trước khi revert
        \Illuminate\Support\Facades\DB::table('promotion_product_variant')
            ->whereNull('product_variant_id')
            ->delete();
        
        Schema::table('promotion_product_variant', function (Blueprint $table) {
            // Drop foreign key constraint
            $table->dropForeign(['product_variant_id']);
        });
        
        // Revert về NOT NULL
        \Illuminate\Support\Facades\DB::statement("
            ALTER TABLE promotion_product_variant 
            MODIFY COLUMN product_variant_id BIGINT UNSIGNED NOT NULL
        ");
        
        // Tạo lại foreign key constraint với NOT NULL
        Schema::table('promotion_product_variant', function (Blueprint $table) {
            $table->foreign('product_variant_id')
                ->references('id')
                ->on('product_variants')
                ->onDelete('cascade');
        });
    }
};

