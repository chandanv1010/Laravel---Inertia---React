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
        Schema::create('import_orders', function (Blueprint $table) {
            $table->id();
            $table->string('code')->nullable()->unique();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->onDelete('set null');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->onDelete('set null');
            $table->foreignId('responsible_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->date('expected_import_date')->nullable();
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->string('tags')->nullable();
            $table->decimal('total_amount', 20, 2)->default(0);
            $table->decimal('discount', 20, 2)->default(0);
            $table->decimal('import_cost', 20, 2)->default(0);
            $table->decimal('amount_to_pay', 20, 2)->default(0);
            $table->string('status')->default('draft'); // draft, pending, completed, cancelled
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_orders');
    }
};
