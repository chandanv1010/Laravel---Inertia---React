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
        Schema::create('product_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('code'); // Mã lô
            $table->date('manufactured_at')->nullable(); // Ngày sản xuất
            $table->date('expired_at')->nullable(); // Hạn sử dụng
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete(); // Lưu kho tại
            $table->unsignedInteger('stock_quantity')->default(0); // Tồn kho lô (đơn giản hoá)
            $table->boolean('is_default')->default(false);
            $table->string('status')->default('active'); // active/expired (frontend có thể tính)
            $table->timestamps();

            $table->unique(['product_id', 'code']);
            $table->index(['product_id', 'is_default']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_batches');
    }
};
