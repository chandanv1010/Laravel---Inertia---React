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
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('apply_tax')->default(false)->comment('Sản phẩm có áp dụng thuế hay không');
            $table->boolean('tax_included')->default(false)->comment('Giá sản phẩm đã bao gồm thuế hay chưa');
            $table->string('tax_mode', 20)->default('inherit')->comment('Cách áp dụng thuế: inherit|none|custom (dùng cho mở rộng)');
            $table->decimal('sale_tax_rate', 5, 2)->default(0)->comment('Snapshot thuế bán hàng (%) tại thời điểm lưu sản phẩm');
            $table->decimal('purchase_tax_rate', 5, 2)->default(0)->comment('Snapshot thuế nhập hàng (%) tại thời điểm lưu sản phẩm');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'apply_tax',
                'tax_included',
                'tax_mode',
                'sale_tax_rate',
                'purchase_tax_rate',
            ]);
        });
    }
};
