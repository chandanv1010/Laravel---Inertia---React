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
        Schema::create('cash_book_entries', function (Blueprint $table) {
            $table->id();
            $table->string('code')->nullable()->unique();
            $table->enum('entry_type', ['income', 'expense', 'transfer'])->default('income');
            $table->decimal('amount', 20, 2)->default(0);
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->foreignId('from_account_id')->nullable()->constrained('bank_accounts')->nullOnDelete();
            $table->foreignId('to_account_id')->nullable()->constrained('bank_accounts')->nullOnDelete();
            $table->string('reference')->nullable();
            $table->date('entry_date');
            $table->enum('status', ['draft', 'completed', 'cancelled'])->default('completed');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['entry_type', 'entry_date']);
            $table->index(['entry_date']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_book_entries');
    }
};
