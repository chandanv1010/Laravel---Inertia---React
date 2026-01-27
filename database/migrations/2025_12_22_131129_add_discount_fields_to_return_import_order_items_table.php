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
        Schema::table('return_import_order_items', function (Blueprint $table) {
            // Thêm các columns cơ bản nếu chưa có
            if (!Schema::hasColumn('return_import_order_items', 'return_import_order_id')) {
                $table->foreignId('return_import_order_id')->constrained('return_import_orders')->onDelete('cascade')->after('id');
            }
            if (!Schema::hasColumn('return_import_order_items', 'product_id')) {
                $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null')->after('return_import_order_id');
            }
            if (!Schema::hasColumn('return_import_order_items', 'product_variant_id')) {
                $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->onDelete('set null')->after('product_id');
            }
            if (!Schema::hasColumn('return_import_order_items', 'quantity')) {
                $table->integer('quantity')->default(0)->after('product_variant_id');
            }
            if (!Schema::hasColumn('return_import_order_items', 'unit_price')) {
                $table->decimal('unit_price', 20, 2)->default(0)->after('quantity');
            }
            if (!Schema::hasColumn('return_import_order_items', 'discount')) {
                $table->decimal('discount', 20, 2)->default(0)->after('unit_price');
            }
            if (!Schema::hasColumn('return_import_order_items', 'discount_type')) {
                // Thêm ENUM với 'fixed', 'amount', 'percent'
                // 'fixed' = không có discount (giá cố định)
                // 'amount' = discount theo số tiền
                // 'percent' = discount theo phần trăm
                $table->enum('discount_type', ['fixed', 'amount', 'percent'])->default('fixed')->after('discount');
            } else {
                // Nếu column đã tồn tại, cần modify ENUM để thêm 'fixed'
                // MySQL không hỗ trợ modify ENUM trực tiếp, cần dùng DB::statement
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE `return_import_order_items` MODIFY COLUMN `discount_type` ENUM('fixed', 'amount', 'percent') DEFAULT 'fixed'");
            }
            if (!Schema::hasColumn('return_import_order_items', 'batch_allocations')) {
                $table->json('batch_allocations')->nullable()->after('discount_type');
            }
            if (!Schema::hasColumn('return_import_order_items', 'total_price')) {
                $table->decimal('total_price', 20, 2)->default(0)->after('batch_allocations');
            }
            if (!Schema::hasColumn('return_import_order_items', 'notes')) {
                $table->text('notes')->nullable()->after('total_price');
            }
            if (!Schema::hasColumn('return_import_order_items', 'order')) {
                $table->integer('order')->default(0)->after('notes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('return_import_order_items', function (Blueprint $table) {
            // Chỉ drop các columns discount và discount_type
            if (Schema::hasColumn('return_import_order_items', 'discount')) {
                $table->dropColumn('discount');
            }
            if (Schema::hasColumn('return_import_order_items', 'discount_type')) {
                $table->dropColumn('discount_type');
            }
        });
    }
};
