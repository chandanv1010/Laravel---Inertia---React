<?php

namespace App\Console\Commands;

use App\Models\ReturnImportOrder;
use App\Models\ReturnImportOrderItem;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FixReturnOrderStock extends Command
{
    protected $signature = 'return-order:fix-stock {code : Mã đơn trả hàng (VD: TH00005)}';

    protected $description = 'Sync lại stock từ batch stocks cho đơn trả hàng (fix cho các đơn đã tạo trước khi có code fix)';

    protected ProductServiceInterface $productService;
    protected ProductVariantServiceInterface $variantService;

    public function __construct(
        ProductServiceInterface $productService,
        ProductVariantServiceInterface $variantService
    ) {
        parent::__construct();
        $this->productService = $productService;
        $this->variantService = $variantService;
    }

    public function handle(): int
    {
        $code = $this->argument('code');
        
        $returnOrder = ReturnImportOrder::where('code', $code)->first();
        
        if (!$returnOrder) {
            $this->error("Không tìm thấy đơn trả hàng với mã: {$code}");
            return self::FAILURE;
        }

        $this->info("Tìm thấy đơn trả hàng: {$code}");
        $this->info("Trạng thái: {$returnOrder->status}");
        $this->info("Xuất kho: " . ($returnOrder->export_to_stock ? 'Có' : 'Không'));
        
        if ($returnOrder->status !== 'completed' || !$returnOrder->export_to_stock) {
            $this->warn("Đơn này chưa xuất kho hoặc chưa completed. Có thể không cần sync stock.");
        }

        $items = $returnOrder->items()->with('product', 'productVariant')->get();
        
        if ($items->isEmpty()) {
            $this->warn("Đơn không có items.");
            return self::SUCCESS;
        }

        $this->info("Tìm thấy " . $items->count() . " items.");
        $this->newLine();

        $productsToSync = [];
        $variantsToSync = [];

        foreach ($items as $item) {
            $productId = $item->product_id;
            $variantId = $item->product_variant_id;
            
            // Lấy product để check management_type
            $product = null;
            if ($variantId) {
                try {
                    $variant = $this->variantService->show($variantId);
                    if ($variant && $variant->product_id) {
                        $product = $this->productService->show($variant->product_id);
                    }
                } catch (\Exception $e) {
                    $this->warn("Không thể load variant {$variantId}: " . $e->getMessage());
                    continue;
                }
            } elseif ($productId) {
                try {
                    $product = $this->productService->show($productId);
                } catch (\Exception $e) {
                    $this->warn("Không thể load product {$productId}: " . $e->getMessage());
                    continue;
                }
            }

            if (!$product) {
                $this->warn("Item ID {$item->id}: Không tìm thấy product/variant");
                continue;
            }

            // Chỉ sync nếu product có management_type = 'batch'
            if ($product->management_type === 'batch') {
                $this->info("Item ID {$item->id}: Sản phẩm quản lý theo lô - Product ID: {$productId}, Variant ID: " . ($variantId ?? 'N/A'));
                
                if ($variantId) {
                    $variantsToSync[$variantId] = true;
                } else {
                    $productsToSync[$productId] = true;
                }
            } else {
                $this->line("Item ID {$item->id}: Sản phẩm không quản lý theo lô - bỏ qua");
            }
        }

        if (empty($productsToSync) && empty($variantsToSync)) {
            $this->info("Không có sản phẩm nào cần sync (tất cả đều không phải batch-managed).");
            return self::SUCCESS;
        }

        $this->newLine();
        $this->info("Bắt đầu sync stock từ batch stocks...");

        DB::beginTransaction();
        try {
            // Sync variants
            foreach ($variantsToSync as $variantId => $_) {
                $this->info("Syncing variant stock từ batches: Variant ID {$variantId}");
                $this->variantService->syncWarehouseStockFromBatches($variantId);
            }

            // Sync products
            foreach ($productsToSync as $productId => $_) {
                $this->info("Syncing product stock từ batches: Product ID {$productId}");
                $this->productService->syncWarehouseStockFromBatches($productId);
            }

            DB::commit();
            $this->newLine();
            $this->info("✅ Đã sync stock thành công!");
            $this->info("Đã sync " . count($variantsToSync) . " variants và " . count($productsToSync) . " products.");
            
            return self::SUCCESS;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Lỗi khi sync stock: " . $e->getMessage());
            Log::error("FixReturnOrderStock failed", [
                'code' => $code,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return self::FAILURE;
        }
    }
}

