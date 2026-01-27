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
        Schema::create('menu_item_languages', function (Blueprint $table) {
            $table->unsignedBigInteger('menu_item_id');
            $table->unsignedBigInteger('language_id');
            $table->string('name');
            $table->string('canonical')->nullable();
            $table->string('url')->nullable();
            $table->foreign('menu_item_id')->references('id')->on('menu_items')->onDelete('cascade');
            $table->foreign('language_id')->references('id')->on('languages')->onDelete('cascade');
            $table->primary(['menu_item_id', 'language_id']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_item_languages');
    }
};
