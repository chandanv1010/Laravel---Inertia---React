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
        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_id')->constrained()->onDelete('cascade');
            $table->foreignId('parent_id')->nullable()->constrained('menu_items')->onDelete('cascade');
            $table->string('name');
            $table->string('url')->nullable();
            $table->string('target')->default('_self'); // _self, _blank
            $table->string('icon')->nullable();
            $table->string('linkable_type')->nullable(); // App\Models\Post, App\Models\PostCatalogue, etc.
            $table->unsignedBigInteger('linkable_id')->nullable();
            $table->string('publish')->default('2'); // 1: inactive, 2: active
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['linkable_type', 'linkable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
