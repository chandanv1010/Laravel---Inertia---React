<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $config = [
            'product_batch_stock_logs' => 'pb_stock_log_ref_idx',
            'product_warehouse_stock_logs' => 'pw_stock_log_ref_idx',
            'product_variant_warehouse_stock_logs' => 'pvw_stock_log_ref_idx'
        ];

        foreach ($config as $tableName => $newIndexName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $newIndexName) {
                // 1. Thêm cột nếu chưa có (phòng trường hợp migration chạy lại sau khi lỗi)
                if (!Schema::hasColumn($tableName, 'reference_id')) {
                    $table->unsignedBigInteger('reference_id')->nullable();
                }
                if (!Schema::hasColumn($tableName, 'reference_type')) {
                    $table->string('reference_type')->nullable();
                }

                // 2. Xử lý Index
                // Kiểm tra nếu Index cũ (tên dài) tồn tại thì xóa đi
                $oldIndexName = $tableName . '_reference_type_reference_id_index';
                $currentIndexes = DB::select("SHOW INDEX FROM $tableName");
                $indexNames = array_map(function($i) { return $i->Key_name; }, $currentIndexes);

                if (in_array($oldIndexName, $indexNames)) {
                    $table->dropIndex($oldIndexName);
                }

                // Thêm index mới (tên ngắn) nếu chưa có
                if (!in_array($newIndexName, $indexNames)) {
                    $table->index(['reference_type', 'reference_id'], $newIndexName);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $config = [
            'product_batch_stock_logs' => 'pb_stock_log_ref_idx',
            'product_warehouse_stock_logs' => 'pw_stock_log_ref_idx',
            'product_variant_warehouse_stock_logs' => 'pvw_stock_log_ref_idx'
        ];

        foreach ($config as $tableName => $indexName) {
            Schema::table($tableName, function (Blueprint $table) use ($indexName) {
                $currentIndexes = DB::select("SHOW INDEX FROM " . $table->getTable());
                $indexNames = array_map(function($i) { return $i->Key_name; }, $currentIndexes);
                
                if (in_array($indexName, $indexNames)) {
                    $table->dropIndex($indexName);
                }

                if (Schema::hasColumn($table->getTable(), 'reference_id')) {
                    $table->dropColumn(['reference_id', 'reference_type']);
                }
            });
        }
    }
};
