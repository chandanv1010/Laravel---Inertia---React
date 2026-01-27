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
        Schema::create('product_catalogues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('parent_id')->nullable();
            $table->integer('lft')->nullable();
            $table->integer('rgt')->nullable();
            $table->integer('level')->nullable();
            $table->string('image')->nullable();
            $table->string('icon')->nullable();
            $table->longText('album')->nullable();
            $table->string('type')->default('default');
            $table->longText('script')->nullable();
            $table->longText('iframe')->nullable();
            $table->integer('order')->default(0);
            $table->enum('publish', [1,2])->default(2);
            $table->string('robots')->nullable()->default('index');
            $table->boolean('auto_translate')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_catalogues');
    }
};
