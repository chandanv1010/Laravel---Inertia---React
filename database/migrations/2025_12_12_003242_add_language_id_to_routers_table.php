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
        Schema::table('routers', function (Blueprint $table) {
            // Thêm language_id để lưu canonical của từng ngôn ngữ
            $table->unsignedBigInteger('language_id')->nullable()->after('routerable_type');
            $table->foreign('language_id')->references('id')->on('languages')->onDelete('cascade');
            
            // Bỏ unique constraint trên canonical vì mỗi ngôn ngữ có thể có canonical giống nhau
            $table->dropUnique(['canonical']);
            
            // Thêm unique constraint trên (canonical, language_id) để đảm bảo mỗi ngôn ngữ có canonical unique
            $table->unique(['canonical', 'language_id'], 'routers_canonical_language_unique');
            
            // Thêm index cho language_id để query nhanh hơn
            $table->index('language_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('routers', function (Blueprint $table) {
            // Xóa index và unique constraint
            $table->dropUnique('routers_canonical_language_unique');
            $table->dropIndex(['language_id']);
            
            // Xóa foreign key và column
            $table->dropForeign(['language_id']);
            $table->dropColumn('language_id');
            
            // Khôi phục unique constraint trên canonical
            $table->unique('canonical');
        });
    }
};
