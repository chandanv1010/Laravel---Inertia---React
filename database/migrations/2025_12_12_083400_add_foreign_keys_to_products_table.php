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
            $table->foreign('product_catalogue_id')
                ->references('id')
                ->on('product_catalogues')
                ->onDelete('set null');

            $table->foreign('product_brand_id')
                ->references('id')
                ->on('product_brands')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['product_catalogue_id']);
            $table->dropForeign(['product_brand_id']);
        });
    }
};

