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
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_method_id')->nullable()->constrained('payment_methods')->onDelete('cascade'); // Liên kết với payment_method (chuyển khoản)
            $table->string('bank_name'); // Tên ngân hàng
            $table->string('account_number'); // Số tài khoản
            $table->string('account_holder_name')->nullable(); // Tên chủ tài khoản
            $table->text('note')->nullable(); // Ghi chú
            $table->boolean('is_active')->default(true); // Trạng thái
            $table->integer('order')->default(0); // Thứ tự
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // Người tạo
            $table->timestamps();
            
            $table->index(['payment_method_id', 'is_active']);
            $table->index('order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_accounts');
    }
};
