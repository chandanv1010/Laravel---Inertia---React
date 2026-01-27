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
        Schema::create('product_brand_language', function (Blueprint $table) {
            $table->id();
            $table->foreignId('language_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_brand_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('canonical')->unique();
            $table->text('description')->nullable();
            $table->longText('content')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_keyword')->nullable();
            $table->text('meta_description')->nullable();
            $table->boolean('auto_translate')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_brand_language');
    }
};
