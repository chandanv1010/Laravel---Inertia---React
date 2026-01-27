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
        Schema::table('post_catalogue_language', function (Blueprint $table) {
            $table->boolean('auto_translate')->default(false)->after('meta_description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('post_catalogue_language', function (Blueprint $table) {
            $table->dropColumn('auto_translate');
        });
    }
};
