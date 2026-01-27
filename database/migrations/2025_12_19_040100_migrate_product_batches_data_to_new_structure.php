<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Migrate dữ liệu từ cấu trúc cũ (product_batches có warehouse_id, stock_quantity) 
     * sang cấu trúc mới (product_batch_warehouses)
     */
    public function up(): void
    {
        DB::transaction(function () {
            // Nhóm các batch cùng code, product_id, product_variant_id lại
            // Tạo 1 batch duy nhất và migrate số lượng vào product_batch_warehouses
            
            // Lấy tất cả batches, nhóm theo (product_id, product_variant_id, code)
            // Sử dụng COALESCE để xử lý NULL trong product_variant_id
            $batchesGrouped = DB::table('product_batches')
                ->select('product_id', DB::raw('COALESCE(product_variant_id, 0) as product_variant_id'), 'code')
                ->where('status', 'active')
                ->groupBy('product_id', DB::raw('COALESCE(product_variant_id, 0)'), 'code')
                ->get();

            foreach ($batchesGrouped as $group) {
                // Xử lý product_variant_id: nếu là 0 thì là NULL
                $variantId = $group->product_variant_id == 0 ? null : $group->product_variant_id;
                
                // Lấy batch đầu tiên làm batch chính (giữ lại thông tin như manufactured_at, expired_at, is_default)
                $query = DB::table('product_batches')
                    ->where('product_id', $group->product_id)
                    ->where('code', $group->code)
                    ->where('status', 'active');
                
                if ($variantId === null) {
                    $query->whereNull('product_variant_id');
                } else {
                    $query->where('product_variant_id', $variantId);
                }
                
                $mainBatch = $query->orderBy('id')->first();

                if (!$mainBatch) continue;

                $mainBatchId = $mainBatch->id;

                // Lấy tất cả batches cùng code để migrate số lượng
                $queryAll = DB::table('product_batches')
                    ->where('product_id', $group->product_id)
                    ->where('code', $group->code)
                    ->where('status', 'active');
                
                if ($variantId === null) {
                    $queryAll->whereNull('product_variant_id');
                } else {
                    $queryAll->where('product_variant_id', $variantId);
                }
                
                $allBatches = $queryAll->get();

                // Xóa các batch trùng (giữ lại batch đầu tiên)
                $batchIdsToDelete = [];
                foreach ($allBatches as $batch) {
                    if ($batch->id != $mainBatchId) {
                        $batchIdsToDelete[] = $batch->id;
                        
                        // Migrate số lượng vào product_batch_warehouses
                        if ($batch->warehouse_id && $batch->stock_quantity > 0) {
                            // Kiểm tra xem đã có record chưa
                            $existing = DB::table('product_batch_warehouses')
                                ->where('product_batch_id', $mainBatchId)
                                ->where('warehouse_id', $batch->warehouse_id)
                                ->first();

                            if ($existing) {
                                // Cộng thêm số lượng
                                DB::table('product_batch_warehouses')
                                    ->where('id', $existing->id)
                                    ->update([
                                        'stock_quantity' => $existing->stock_quantity + $batch->stock_quantity,
                                    ]);
                            } else {
                                // Tạo mới
                                DB::table('product_batch_warehouses')->insert([
                                    'product_batch_id' => $mainBatchId,
                                    'warehouse_id' => $batch->warehouse_id,
                                    'stock_quantity' => $batch->stock_quantity,
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            }
                        }
                    } else {
                        // Batch chính: migrate số lượng của nó
                        if ($batch->warehouse_id && $batch->stock_quantity > 0) {
                            DB::table('product_batch_warehouses')->insert([
                                'product_batch_id' => $mainBatchId,
                                'warehouse_id' => $batch->warehouse_id,
                                'stock_quantity' => $batch->stock_quantity,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                }

                // Xóa các batch trùng
                if (!empty($batchIdsToDelete)) {
                    // Cập nhật product_batch_stock_logs để trỏ về batch chính
                    DB::table('product_batch_stock_logs')
                        ->whereIn('product_batch_id', $batchIdsToDelete)
                        ->update(['product_batch_id' => $mainBatchId]);

                    // Xóa các batch trùng
                    DB::table('product_batches')
                        ->whereIn('id', $batchIdsToDelete)
                        ->delete();
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Không thể reverse một cách chính xác vì đã merge dữ liệu
        // Migration này chỉ chạy một chiều
    }
};
