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
            $table->string('deduction_reason')->nullable()->after('deduction');
            $table->enum('refund_status', ['received', 'later'])->default('later')->after('refund_amount');
            $table->string('payment_method')->nullable()->after('refund_status');
            $table->date('refund_date')->nullable()->after('payment_method');
            $table->string('refund_reference')->nullable()->after('refund_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('return_import_orders', function (Blueprint $table) {
            $table->dropColumn([
                'deduction_reason',
                'refund_status',
                'payment_method',
                'refund_date',
                'refund_reference',
            ]);
        });
    }
};
