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
        Schema::table('promotions', function (Blueprint $table) {
            $table->enum('apply_source', ['all', 'product_catalogue', 'product_variant'])->default('all')->after('condition_value');
            // We can't easily change enum values in Laravel without raw SQL or dropping/re-adding.
            // Since this is a dev environment/early stage, we might just modify the column definition if supported by DB driver,
            // or just ensure the code handles it. But standard migration is better.
            // However, modifying enum is driver dependent. 
            // For safety and compatibility, we will assume standard enum modification is tricky.
            // But since 'discount_type' is nullable, we can try to re-declare it if needed, or just let it accept new values if strict mode is off (not recommended).
            // Better approach for enum modification in MySQL:
            // DB::statement("ALTER TABLE promotions MODIFY COLUMN discount_type ENUM('fixed_amount', 'percentage', 'same_price') NULL");
        });

        // Use raw SQL to update enum because Doctrine DBAL doesn't support it well for enums in all cases
        // and standard Laravel schema builder doesn't support 'change()' on enums easily everywhere.
        // Assuming MySQL/MariaDB for this user based on Laragon.
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE promotions MODIFY COLUMN discount_type ENUM('fixed_amount', 'percentage', 'same_price') NULL");


        Schema::create('promotion_product_variant', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_variant_id')->constrained('product_variants')->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('promotion_product_catalogue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained()->onDelete('cascade');
            // Make sure table name for foreign key is correct. Assuming 'product_catalogues' table exists for categories.
            $table->foreignId('product_catalogue_id')->constrained('product_catalogues')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotion_product_catalogue');
        Schema::dropIfExists('promotion_product_variant');

        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn('apply_source');
        });
        
        // Revert enum
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE promotions MODIFY COLUMN discount_type ENUM('fixed_amount', 'percentage') NULL");
    }
};
