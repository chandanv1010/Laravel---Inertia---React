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
        // 1. System Catalogues (Groups like 'Generic', 'SEO', 'Contact')
        Schema::create('system_catalogues', function (Blueprint $table) {
            $table->id();
            $table->string('name')->comment('Display name of the group');
            $table->string('keyword')->unique()->comment('Unique key for internal use');
            $table->integer('sort_order')->default(0);
            $table->tinyInteger('publish')->default(1);
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Systems (Field Definitions)
        Schema::create('systems', function (Blueprint $table) {
            $table->id();
            $table->foreignId('system_catalogue_id')->constrained('system_catalogues')->onDelete('cascade');
            $table->string('label')->comment('Label of the field');
            $table->string('keyword')->unique()->comment('Key of the setting');
            $table->string('type')->comment('text, textarea, editor, select, image, etc.');
            $table->longText('description')->nullable()->comment('Helper text');
            $table->integer('sort_order')->default(0);
            $table->tinyInteger('publish')->default(1);
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. System Language (Values)
        Schema::create('system_language', function (Blueprint $table) {
            $table->foreignId('system_id')->constrained('systems')->onDelete('cascade');
            $table->foreignId('language_id')->constrained('languages')->onDelete('cascade');
            $table->longText('content')->nullable()->comment('The value of the setting for this language');
            
            $table->primary(['system_id', 'language_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_language');
        Schema::dropIfExists('systems');
        Schema::dropIfExists('system_catalogues');
    }
};
