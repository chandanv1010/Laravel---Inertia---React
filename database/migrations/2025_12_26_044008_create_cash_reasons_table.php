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
        Schema::create('cash_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('name')->comment('Tên lý do thu/chi');
            $table->enum('type', ['receipt', 'payment'])->comment('Loại: receipt=Thu, payment=Chi');
            $table->text('description')->nullable()->comment('Mô tả');
            $table->boolean('is_default')->default(false)->comment('Lý do mặc định');
            $table->string('publish', 10)->default('2')->comment('2=Active, 1=Inactive');
            $table->integer('order')->default(0)->comment('Thứ tự sắp xếp');
            $table->timestamps();
            $table->softDeletes();

            $table->index('type');
            $table->index('publish');
            $table->index('is_default');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_reasons');
    }
};
