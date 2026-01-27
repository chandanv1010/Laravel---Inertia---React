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
        Schema::create('banners', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique(); // homepage_hero, sidebar_top, etc.
            $table->string('position')->nullable(); // Position label for UI
            $table->text('description')->nullable();
            $table->integer('width')->nullable(); // Suggested width
            $table->integer('height')->nullable(); // Suggested height
            $table->string('publish')->default('2'); // 1 = off, 2 = on
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('banners');
    }
};
