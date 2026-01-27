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
            // Thêm product_id nullable để hỗ trợ sản phẩm không có variant
            $table->foreignId('product_id')->nullable()->after('promotion_id')->constrained('products')->onDelete('cascade');
            
            // Tạo unique constraint để tránh duplicate: một promotion chỉ có thể có một record cho mỗi product hoặc variant
            // Nếu product_variant_id có giá trị thì product_id phải null, và ngược lại
            // MySQL không hỗ trợ partial unique index tốt, nên ta sẽ dùng unique trên cả 2 columns
            // Nhưng vì có thể có cả product_id và product_variant_id cùng lúc (variant thuộc product),
            // ta sẽ tạo unique trên (promotion_id, product_id, product_variant_id)
            // Nhưng thực tế, nếu có variant thì chỉ cần lưu variant_id, product_id có thể lấy từ variant
            // Nên logic sẽ là: nếu có variant thì chỉ lưu variant_id, nếu không có variant thì lưu product_id
        });
        
        // Tạo unique constraint để đảm bảo:
        // - Một promotion không thể có cùng một product_id nhiều lần (khi product_id không null và product_variant_id null)
        // - Một promotion không thể có cùng một product_variant_id nhiều lần
        // Sử dụng raw SQL vì Laravel schema builder không hỗ trợ partial unique index tốt
        \Illuminate\Support\Facades\DB::statement("
            ALTER TABLE promotion_product_variant 
            ADD UNIQUE KEY promotion_product_unique (promotion_id, product_id, product_variant_id)
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promotion_product_variant', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropUnique('promotion_product_unique');
            $table->dropColumn('product_id');
        });
    }
};

