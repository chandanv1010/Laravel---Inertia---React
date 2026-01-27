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
        Schema::table('return_import_orders', function (Blueprint $table) {
            $table->text('return_costs')->nullable()->after('return_cost');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('return_import_orders', function (Blueprint $table) {
            $table->dropColumn('return_costs');
        });
    }
};
