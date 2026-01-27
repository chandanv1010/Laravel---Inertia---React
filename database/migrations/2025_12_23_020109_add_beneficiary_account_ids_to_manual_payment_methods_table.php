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
        Schema::table('manual_payment_methods', function (Blueprint $table) {
            $table->json('beneficiary_account_ids')->nullable()->after('beneficiary_account_id'); // Lưu nhiều tài khoản thụ hưởng dưới dạng JSON array
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('manual_payment_methods', function (Blueprint $table) {
            $table->dropColumn('beneficiary_account_ids');
        });
    }
};
