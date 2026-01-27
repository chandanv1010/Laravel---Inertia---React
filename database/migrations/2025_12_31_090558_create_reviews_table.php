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
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('reviewable_id');
            $table->string('reviewable_type');
            $table->unsignedBigInteger('user_id')->nullable(); // Admin creating it, or real user
            $table->string('fullname');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->integer('score')->default(5); // 1-5
            $table->text('content')->nullable();
            $table->tinyInteger('publish')->default(2); // 1: Active, 2: Inactive
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['reviewable_id', 'reviewable_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
