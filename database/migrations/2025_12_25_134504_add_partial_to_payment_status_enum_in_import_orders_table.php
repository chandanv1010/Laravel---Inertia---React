<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // MySQL không hỗ trợ ALTER enum trực tiếp, cần dùng raw SQL
        DB::statement("ALTER TABLE `import_orders` MODIFY COLUMN `payment_status` ENUM('paid', 'unpaid', 'partial') DEFAULT 'unpaid'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert về enum cũ (chỉ paid và unpaid)
        // Lưu ý: Nếu có dữ liệu 'partial', cần xử lý trước khi rollback
        DB::statement("ALTER TABLE `import_orders` MODIFY COLUMN `payment_status` ENUM('paid', 'unpaid') DEFAULT 'unpaid'");
    }
};
