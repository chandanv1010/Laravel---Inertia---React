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
        Schema::table('settings', function (Blueprint $table) {
            $table->unsignedBigInteger('language_id')->nullable()->after('key')->comment('ID ngôn ngữ (null = mặc định)');
            
            // Xóa unique constraint cũ
            $table->dropUnique('settings_group_key_unique');
        });

        // Thêm unique constraint mới bao gồm language_id
        Schema::table('settings', function (Blueprint $table) {
            $table->unique(['group', 'key', 'language_id'], 'settings_group_key_language_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            // Xóa unique constraint mới
            $table->dropUnique('settings_group_key_language_unique');
            
            $table->dropColumn('language_id');
            
            // Khôi phục unique constraint cũ
            $table->unique(['group', 'key'], 'settings_group_key_unique');
        });
    }
};
