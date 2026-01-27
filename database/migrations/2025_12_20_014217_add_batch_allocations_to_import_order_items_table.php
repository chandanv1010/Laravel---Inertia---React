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
            // Thêm cột batch_allocations để lưu thông tin phân bổ lô
            // Cấu trúc JSON: [{"batch_id": 1, "batch_code": "LO001", "quantity": 10}, ...]
            if (!Schema::hasColumn('import_order_items', 'batch_allocations')) {
                $table->json('batch_allocations')->nullable()->after('discount_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('import_order_items', function (Blueprint $table) {
            if (Schema::hasColumn('import_order_items', 'batch_allocations')) {
                $table->dropColumn('batch_allocations');
            }
        });
    }
};
