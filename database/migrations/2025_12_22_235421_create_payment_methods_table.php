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
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Tên phương thức thanh toán
            $table->string('code')->unique(); // Mã định danh (vnpay, seapay, paypal, cash, bank_transfer, etc.)
            $table->enum('type', ['integrated', 'manual'])->default('manual'); // Loại: tích hợp hoặc thủ công
            $table->enum('status', ['active', 'inactive'])->default('active'); // Trạng thái
            $table->boolean('is_default')->default(false); // Phương thức mặc định
            $table->string('provider')->nullable(); // Nhà cung cấp (VNPAY, SEAPAY, PAYPAL)
            $table->json('config')->nullable(); // Cấu hình kết nối (MID, API keys, etc.)
            $table->text('description')->nullable(); // Mô tả
            $table->string('icon')->nullable(); // Icon/Logo
            $table->integer('order')->default(0); // Thứ tự hiển thị
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // Người tạo
            $table->timestamps();
            
            $table->index(['type', 'status']);
            $table->index('is_default');
            $table->index('order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
