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
        Schema::create('manual_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_method_id')->unique()->constrained('payment_methods')->onDelete('cascade'); // Liên kết 1-1 với payment_method
            $table->text('payment_instructions')->nullable(); // Hướng dẫn thanh toán
            $table->boolean('allow_use_when_paying')->default(true); // Cho phép sử dụng khi thanh toán
            $table->boolean('create_receipt_immediately')->default(false); // Tạo phiếu thu ngay khi xác nhận thanh toán đơn hàng
            $table->foreignId('beneficiary_account_id')->nullable()->constrained('bank_accounts')->onDelete('set null'); // Tài khoản thụ hưởng (chỉ cho chuyển khoản)
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // Người tạo
            $table->timestamps();
            
            $table->index('payment_method_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manual_payment_methods');
    }
};
