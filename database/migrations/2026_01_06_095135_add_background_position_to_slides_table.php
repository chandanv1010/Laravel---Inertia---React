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
        Schema::table('slides', function (Blueprint $table) {
            $table->integer('background_position_x')->default(50)->after('background_color');
            $table->integer('background_position_y')->default(50)->after('background_position_x');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('slides', function (Blueprint $table) {
            $table->dropColumn(['background_position_x', 'background_position_y']);
        });
    }
};
