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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('customer_catalogue_id')->nullable()->constrained('customer_catalogues')->onDelete('set null');
            
            // Thông tin cơ bản
            $table->string('last_name');
            $table->string('first_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->boolean('receive_promotional_emails')->default(false);
            
            // Địa chỉ nhận hàng
            $table->string('shipping_last_name')->nullable();
            $table->string('shipping_first_name')->nullable();
            $table->string('shipping_company')->nullable();
            $table->string('shipping_phone')->nullable();
            $table->string('shipping_country')->nullable()->default('Vietnam');
            $table->string('shipping_postal_code')->nullable();
            $table->string('shipping_province')->nullable();
            $table->string('shipping_district')->nullable();
            $table->string('shipping_ward')->nullable();
            $table->text('shipping_address')->nullable();
            $table->boolean('use_new_address_format')->default(true);
            
            // Ghi chú
            $table->text('notes')->nullable();
            
            $table->enum('publish', [1,2])->default(2);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index('email');
            $table->index('customer_catalogue_id');
            $table->index('publish');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
