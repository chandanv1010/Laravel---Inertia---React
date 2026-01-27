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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('group', 50)->comment('Nhóm cấu hình (vd: tax, store, shipping)');
            $table->string('key', 100)->comment('Khóa cấu hình trong nhóm');
            $table->json('value')->nullable()->comment('Giá trị cấu hình dạng JSON (scalar/object/array)');
            $table->string('type', 30)->default('json')->comment('Kiểu dữ liệu logic (bool|int|float|string|json)');
            $table->string('description')->nullable()->comment('Mô tả cấu hình');
            $table->timestamps();

            $table->unique(['group', 'key'], 'settings_group_key_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
