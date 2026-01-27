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
        Schema::create('logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // User thực hiện action
            $table->string('action'); // create, update, delete, view, translate, etc.
            $table->string('module'); // post, post_catalogue, user, etc.
            $table->unsignedBigInteger('record_id')->nullable(); // ID của record được thao tác
            $table->string('record_type')->nullable(); // Model class name (Post::class, User::class, etc.)
            $table->string('ip_address', 45)->nullable(); // IP của user
            $table->text('user_agent')->nullable(); // User agent
            $table->text('description')->nullable(); // Mô tả chi tiết action
            $table->json('old_data')->nullable(); // Dữ liệu cũ (cho update/delete)
            $table->json('new_data')->nullable(); // Dữ liệu mới (cho create/update)
            $table->json('changes')->nullable(); // Chỉ lưu các field thay đổi (cho update)
            $table->enum('status', ['success', 'failed', 'pending'])->default('success'); // Trạng thái action
            $table->text('error_message')->nullable(); // Nếu failed, lưu error message
            $table->string('route')->nullable(); // Route được gọi
            $table->string('method')->nullable(); // HTTP method (GET, POST, PUT, DELETE, etc.)
            $table->timestamps();
            
            // Indexes để tối ưu query
            $table->index(['user_id', 'created_at']);
            $table->index(['module', 'action', 'created_at']);
            $table->index(['record_id', 'record_type']);
            $table->index('created_at'); // Để query theo thời gian
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('logs');
    }
};
