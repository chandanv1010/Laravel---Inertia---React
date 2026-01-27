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
        Schema::create('slides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('banner_id')->constrained()->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('background_image')->nullable();
            $table->string('background_color')->nullable()->default('#ffffff');
            $table->json('elements')->nullable(); // JSON containing all draggable elements
            $table->string('url')->nullable(); // Link when clicking entire slide
            $table->string('target')->default('_self');
            $table->integer('order')->default(0);
            $table->string('publish')->default('2'); // 1 = off, 2 = on
            $table->timestamp('start_date')->nullable(); // Schedule start
            $table->timestamp('end_date')->nullable(); // Schedule end
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('slides');
    }
};
