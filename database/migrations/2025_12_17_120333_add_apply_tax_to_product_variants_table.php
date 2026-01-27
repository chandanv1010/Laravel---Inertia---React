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
            // Snapshot flags for variants if needed in future (currently product-level is enough)
            $table->boolean('apply_tax')->default(false)->comment('Phiên bản có áp dụng thuế hay không (dùng cho mở rộng)');
            $table->boolean('tax_included')->default(false)->comment('Giá phiên bản đã bao gồm thuế hay chưa (dùng cho mở rộng)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn(['apply_tax', 'tax_included']);
        });
    }
};
