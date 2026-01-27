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
        Schema::create('widgets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('keyword')->unique();
            $table->text('description')->nullable();
            $table->text('album')->nullable(); // Store JSON array of image paths
            $table->longText('model_id')->nullable(); // Store JSON array of selected item IDs [1,2,3]
            $table->string('model')->nullable(); // Class name e.g. App\Models\Post
            $table->longText('content')->nullable(); // Custom HTML Content
            $table->string('short_code')->nullable(); // e.g. [widget id="1"]
            $table->tinyInteger('publish')->default(2);
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('widgets');
    }
};
