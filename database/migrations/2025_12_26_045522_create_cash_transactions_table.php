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
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_code')->unique()->comment('Mã phiếu: PT-xxx, PC-xxx, CQ-xxx');
            $table->enum('transaction_type', ['receipt', 'payment', 'transfer'])->comment('Loại phiếu: Thu/Chi/Chuyển quỹ');
            $table->enum('payment_method', ['cash', 'bank'])->default('cash')->comment('Tiền mặt hoặc Ngân hàng');
            
            // Partner info (for receipt/payment)
            $table->string('partner_group')->nullable()->comment('Nhóm đối tượng: supplier, customer, employee');
            $table->unsignedBigInteger('partner_id')->nullable()->comment('ID đối tượng cụ thể');
            
            // Transaction details
            $table->foreignId('reason_id')->constrained('cash_reasons')->comment('Lý do thu/chi');
            $table->decimal('amount', 15, 2)->comment('Số tiền');
            $table->text('description')->nullable()->comment('Diễn giải');
            
            // Store/Branch info
            $table->foreignId('store_id')->nullable()->constrained('stores')->onDelete('set null')->comment('Chi nhánh xuất/nhận quỹ');
            $table->foreignId('recipient_store_id')->nullable()->constrained('stores')->onDelete('set null')->comment('Chi nhánh nhận (chuyển quỹ nội bộ)');
            
            // Additional info
            $table->date('transaction_date')->comment('Ngày giao dịch');
            $table->string('reference_code')->nullable()->comment('Mã chứng từ gốc');
            $table->json('attachments')->nullable()->comment('Ảnh chứng từ');
            
            // Metadata
            $table->foreignId('user_id')->constrained('users')->comment('Người tạo phiếu');
            $table->string('publish', 10)->default('2')->comment('2=Active, 1=Inactive');
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index('transaction_type');
            $table->index('payment_method');
            $table->index('transaction_date');
            $table->index('store_id');
            $table->index('publish');
            $table->index(['partner_group', 'partner_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_transactions');
    }
};
