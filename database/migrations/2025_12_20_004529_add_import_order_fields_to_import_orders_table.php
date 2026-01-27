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
        Schema::table('import_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('import_orders', 'discount_type')) {
                $table->enum('discount_type', ['amount', 'percent'])->default('amount')->after('discount');
            }
            if (!Schema::hasColumn('import_orders', 'import_costs')) {
                $table->json('import_costs')->nullable()->after('import_cost');
            }
            if (!Schema::hasColumn('import_orders', 'payment_status')) {
                $table->enum('payment_status', ['paid', 'unpaid'])->default('unpaid')->after('amount_to_pay');
            }
            if (!Schema::hasColumn('import_orders', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('payment_status');
            }
            if (!Schema::hasColumn('import_orders', 'payment_amount')) {
                $table->decimal('payment_amount', 20, 2)->default(0)->after('payment_method');
            }
            if (!Schema::hasColumn('import_orders', 'payment_date')) {
                $table->date('payment_date')->nullable()->after('payment_amount');
            }
            if (!Schema::hasColumn('import_orders', 'payment_reference')) {
                $table->string('payment_reference')->nullable()->after('payment_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('import_orders', function (Blueprint $table) {
            $table->dropColumn([
                'discount_type',
                'import_costs',
                'payment_status',
                'payment_method',
                'payment_amount',
                'payment_date',
                'payment_reference',
            ]);
        });
    }
};
