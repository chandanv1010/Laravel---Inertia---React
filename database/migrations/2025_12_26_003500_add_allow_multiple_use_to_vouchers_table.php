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
        Schema::table('vouchers', function (Blueprint $table) {
            // Thêm cột cho phép khách hàng dùng nhiều lần (mặc định: true - dùng nhiều lần)
            $table->boolean('allow_multiple_use')->default(true)->after('limit_per_customer')
                ->comment('true = Cho phép dùng nhiều lần, false = Chỉ dùng 1 lần');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropColumn('allow_multiple_use');
        });
    }
};
