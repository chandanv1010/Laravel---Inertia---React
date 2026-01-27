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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->unsignedBigInteger('product_catalogue_id')->nullable();
            $table->unsignedBigInteger('product_brand_id')->nullable();
            $table->string('image')->nullable();
            $table->string('icon')->nullable();
            $table->longText('album')->nullable();
            $table->longText('script')->nullable();
            $table->longText('iframe')->nullable();
            $table->longText('qrcode')->nullable();
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
        Schema::dropIfExists('products');
    }
};
