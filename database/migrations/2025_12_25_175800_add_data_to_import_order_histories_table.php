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
        Schema::table('import_order_histories', function (Blueprint $table) {
            $table->json('data')->nullable()->after('description'); // Lưu dữ liệu chi tiết (amount, note, etc.)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('import_order_histories', function (Blueprint $table) {
            $table->dropColumn('data');
        });
    }
};
