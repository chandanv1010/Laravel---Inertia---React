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
        Schema::table('products', function (Blueprint $table) {
            $table->string('gallery_style')->default('vertical')->after('image')->comment('horizontal, vertical');
            $table->string('image_aspect_ratio')->default('16:9')->after('gallery_style');
            $table->string('image_object_fit')->default('contain')->after('image_aspect_ratio')->comment('contain, cover, fill');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['gallery_style', 'image_aspect_ratio', 'image_object_fit']);
        });
    }
};
