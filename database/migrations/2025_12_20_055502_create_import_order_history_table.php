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
        Schema::create('import_order_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_order_id')->constrained('import_orders')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('action'); // 'Thêm mới đơn nhập hàng', 'Xác nhận nhập kho đơn nhập', etc.
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index(['import_order_id', 'created_at']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_order_histories');
    }
};
