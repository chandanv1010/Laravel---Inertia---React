<?php

namespace App\Http\Resources\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;
use App\Services\Impl\V1\Promotion\PromotionPricingService;

class ProductResource extends JsonResource
{
    /**
     * Get total stock quantity
     * Supports: basic, batch, imei products with or without variants
     */
    private function getStockQuantity(): int
    {
        $total = 0;
        $isBatchManaged = $this->management_type === 'batch';
        $hasVariants = $this->relationLoaded('variants') && $this->variants->count() > 0;
        
        // Case 1: Product có variants
        if ($hasVariants) {
            foreach ($this->variants as $variant) {
                $total += $this->getVariantStockQuantity($variant, $isBatchManaged);
            }
            if ($total > 0) {
                return (int) $total;
            }
        }
        
        // Case 2: Product không có variant
        if ($isBatchManaged) {
            // Lấy stock từ batches của product
            if ($this->relationLoaded('batches')) {
                foreach ($this->batches as $batch) {
                    if ($batch->relationLoaded('warehouseStocks')) {
                        $total += $batch->warehouseStocks->sum('stock_quantity');
                    }
                }
            }
        } else {
            // Lấy stock trực tiếp từ product warehouse stocks
            if ($this->relationLoaded('warehouseStocks')) {
                $total = (int) $this->warehouseStocks->sum('stock_quantity');
            }
        }
        
        return (int) $total;
    }
    
    /**
     * Get stock quantity for a specific variant
     */
    private function getVariantStockQuantity($variant, bool $isBatchManaged): int
    {
        $stock = 0;
        
        if ($isBatchManaged) {
            // Batch-managed: lấy stock từ variant's batches
            if ($variant->relationLoaded('batches') && $variant->batches->isNotEmpty()) {
                foreach ($variant->batches as $batch) {
                    if ($batch->relationLoaded('warehouseStocks')) {
                        $stock += $batch->warehouseStocks->sum('stock_quantity');
                    }
                }
            } else {
                // Fallback: Nếu là batch nhưng không có lô hàng nào được load, thử lấy từ warehouseStocks cơ bản
                if ($variant->relationLoaded('warehouseStocks')) {
                    $stock = $variant->warehouseStocks->sum('stock_quantity');
                }
            }
        } else {
            // Non-batch: lấy stock từ variant's warehouse stocks
            if ($variant->relationLoaded('warehouseStocks')) {
                $stock = $variant->warehouseStocks->sum('stock_quantity');
            }
        }
        
        return (int) $stock;
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Get pricing service
        $pricingService = app(PromotionPricingService::class);
        $pricingData = $pricingService->calculateFinalPrice($this->resource, 1, true);

        // Language fields
        $language = $this->relationLoaded('current_languages') && $this->current_languages->isNotEmpty()
            ? $this->current_languages->first()
            : ($this->relationLoaded('languages') && $this->languages->isNotEmpty()
                ? $this->languages->first()
                : null);

        // Fetch unpaid order quantities for "Đang giao dịch" (trading_quantity)
        // AND incoming quantities for "Hàng đang về" (incoming_quantity)
        // Grouped by [type][target_id][warehouse_id]
        $tradingData = $this->getTradingQuantityData();
        $incomingData = $this->getIncomingQuantityData();
        
        return [
                   'id' => $this->id,
                   'product_catalogue_id' => $this->product_catalogue_id,
                   'product_brand_id' => $this->product_brand_id,
                   'sku' => $this->sku,
                   'barcode' => $this->barcode,
                   'unit' => $this->unit,
                   'retail_price' => $this->retail_price !== null ? (float) $this->retail_price : 0,
                   'wholesale_price' => $this->wholesale_price !== null ? (float) $this->wholesale_price : 0,
                   'management_type' => $this->management_type,
                   'track_inventory' => (bool) $this->track_inventory,
                   'allow_negative_stock' => (bool) $this->allow_negative_stock,
                   'low_stock_alert' => (int) ($this->low_stock_alert ?? 0),
                   'expired_warning_days' => (int) ($this->expired_warning_days ?? 1),
                   'apply_tax' => (bool) ($this->apply_tax ?? false),
                   'tax_included' => (bool) ($this->tax_included ?? false),
                   'tax_mode' => $this->tax_mode ?? 'inherit',
                   'sale_tax_rate' => $this->sale_tax_rate !== null ? (float) $this->sale_tax_rate : 0,
                   'purchase_tax_rate' => $this->purchase_tax_rate !== null ? (float) $this->purchase_tax_rate : 0,
                   'order' => $this->order ?? 0,
                   'publish' => $this->publish ?? '1',
                   'image' => $this->image,
            'album' => $this->album, // Cần cho save page
            'robots' => $this->robots ?? null, // Cần cho save page
            'auto_translate' => $this->auto_translate ?? false,
            // Gallery settings
            'gallery_style' => $this->gallery_style ?? 'vertical',
            'image_aspect_ratio' => $this->image_aspect_ratio ?? '16:9',
            'image_object_fit' => $this->image_object_fit ?? 'contain',
            'created_at' => Carbon::parse($this->created_at)->format('d-m-Y'),
            'updated_at' => Carbon::parse($this->updated_at)->format('d-m-Y'),
            // Language fields - trả về trong current_language object (giống ProductCatalogueResource)
            'current_language' => $language ? [
                'name' => $language->pivot->name ?? '',
                'description' => $language->pivot->description ?? null,
                'content' => $language->pivot->content ?? null,
                'canonical' => $language->pivot->canonical ?? null,
                'meta_title' => $language->pivot->meta_title ?? null,
                'meta_keyword' => $language->pivot->meta_keyword ?? null,
                'meta_description' => $language->pivot->meta_description ?? null,
            ] : null,
            // Legacy flat structure (giữ lại để tương thích nếu có code cũ đang dùng)
            'name' => $language?->pivot->name ?? '',
            'description' => $language?->pivot->description ?? null,
            'content' => $language?->pivot->content ?? null,
            'canonical' => $language?->pivot->canonical ?? null,
            'meta_title' => $language?->pivot->meta_title ?? null,
            'meta_keyword' => $language?->pivot->meta_keyword ?? null,
            'meta_description' => $language?->pivot->meta_description ?? null,
            
            // NEW: Unified Pricing Data for Product Level
            'price' => (float) ($this->retail_price ?? 0),
            'sale_price' => $pricingData['final_price'] ?? (float)($this->retail_price ?? 0),
            'final_price' => $pricingData['final_price'] ?? (float)($this->retail_price ?? 0),
            'original_price' => $pricingData['original_price'] ?? (float)($this->retail_price ?? 0),
            'discount_amount' => $pricingData['discount_amount'] ?? 0,
            'discount_percent' => $pricingData['discount_percent'] ?? 0,
            'has_discount' => $pricingData['has_discount'] ?? false,
            'applied_promotions' => $pricingData['applied_promotions'] ?? [],
            'promotion_id' => $pricingData['promotion_id'] ?? null,
            'promotion_name' => $pricingData['promotion_name'] ?? null,
            'promotion_type' => !empty($pricingData['applied_promotions']) ? $pricingData['applied_promotions'][0]['type'] : null,
            // Creators - chỉ trả về id và name
            'creator_id' => $this->whenLoaded('creators', fn() => $this->creators->id ?? null),
            'creator_name' => $this->whenLoaded('creators', fn() => $this->creators->name ?? null),
            // Product catalogues - Service đã load hết, chỉ trả về
            'product_catalogues' => $this->whenLoaded('product_catalogues', function(){
                return $this->product_catalogues->map(function($catalogue){
                    // Service đã load current_languages cho catalogue, chỉ lấy dữ liệu
                    $catalogueName = $catalogue->relationLoaded('current_languages') && $catalogue->current_languages->isNotEmpty()
                        ? $catalogue->current_languages->first()?->pivot->name
                        : ($catalogue->relationLoaded('languages') && $catalogue->languages->isNotEmpty()
                            ? $catalogue->languages->first()?->pivot->name
                            : 'N/A');
                    
                    return [
                        'id' => $catalogue->id,
                        'name' => $catalogueName ?? 'N/A'
                    ];
                });
            }),
            'pricing_tiers' => $this->whenLoaded('pricingTiers', function () {
                return $this->pricingTiers->map(function ($tier) {
                    return [
                        'min_quantity' => (int) ($tier->min_quantity ?? 0),
                        'max_quantity' => $tier->max_quantity !== null ? (int) $tier->max_quantity : null,
                        'price' => $tier->price !== null ? (float) $tier->price : 0,
                    ];
                })->values();
            }, []),
            'tags' => $this->whenLoaded('tags', function () {
                return $this->tags->pluck('name')->filter()->values()->toArray();
            }, []),
            'variants' => $this->whenLoaded('variants', function () use ($tradingData, $incomingData) {
                return $this->variants->map(function ($variant) use ($tradingData, $incomingData) {
                    // Check management_type của variant — fallback về 'basic' nếu chưa set
                    // (KHÔNG fallback về 'batch' vì sẽ đọc sai bảng -> stock = 0)
                    $isVariantBatchManaged = ($variant->management_type ?? 'basic') === 'batch';
                
                    $attributesMap = [];
                    if ($variant->relationLoaded('attributes')) {
                        foreach ($variant->attributes as $attribute) {
                            $catalogueName = null;
                            if (
                                $attribute->relationLoaded('attribute_catalogue') &&
                                $attribute->attribute_catalogue &&
                                $attribute->attribute_catalogue->relationLoaded('current_languages') &&
                                $attribute->attribute_catalogue->current_languages->isNotEmpty()
                            ) {
                                $catalogueName = $attribute->attribute_catalogue->current_languages->first()?->pivot?->name;
                            }
                            $key = $catalogueName ?: ('attr_' . $attribute->attribute_catalogue_id);
                            $attributesMap[$key] = $attribute->value ?? '';
                        }
                    }
                    
                    // Calculate stock quantity based on variant's management type
                    $stockQuantity = $this->getVariantStockQuantity($variant, $isVariantBatchManaged);
                    
                    // Get warehouse stocks for display
                    $warehouseStocks = [];
                    if ($isVariantBatchManaged && $variant->relationLoaded('batches')) {
                        // For batch-managed variant: aggregate from batch warehouse stocks
                        $warehouseAggregated = [];
                        foreach ($variant->batches as $batch) {
                            if ($batch->relationLoaded('warehouseStocks')) {
                                foreach ($batch->warehouseStocks as $batchStock) {
                                    $wid = $batchStock->warehouse_id;
                                    if (!isset($warehouseAggregated[$wid])) {
                                        $warehouseAggregated[$wid] = [
                                            'warehouse_id' => (int) $wid,
                                            'stock_quantity' => 0,
                                            'trading_quantity' => (int) ($tradingData['variant'][$variant->id][$wid] ?? 0),
                                            'incoming_quantity' => (int) ($incomingData['variant'][$variant->id][$wid] ?? 0),
                                            'storage_location' => $batchStock->storage_location ?? null,
                                        ];
                                    }
                                    $warehouseAggregated[$wid]['stock_quantity'] += (int) ($batchStock->stock_quantity ?? 0);
                                }
                            }
                        }
                        $warehouseStocks = array_values($warehouseAggregated);
                    } elseif ($variant->relationLoaded('warehouseStocks')) {
                        // For basic/imei variant: get from warehouseStocks directly
                        $warehouseStocks = $variant->warehouseStocks->map(function ($stock) use ($variant, $tradingData, $incomingData) {
                            return [
                                'warehouse_id' => (int) $stock->warehouse_id,
                                'stock_quantity' => (int) ($stock->stock_quantity ?? 0),
                                'trading_quantity' => (int) ($tradingData['variant'][$variant->id][$stock->warehouse_id] ?? 0),
                                'incoming_quantity' => (int) ($incomingData['variant'][$variant->id][$stock->warehouse_id] ?? 0),
                                'storage_location' => $stock->storage_location,
                            ];
                        })->values()->toArray();
                    }

                    // CRITICAL: Calculate promotion pricing for variant
                    $pricingService = app(PromotionPricingService::class);
                    $pricingData = $pricingService->calculateFinalPrice($variant, 1, true);
                    
                    return [
                        'id' => $variant->id,
                        'sku' => $variant->sku ?? '',
                        'retail_price' => $variant->retail_price !== null ? (float) $variant->retail_price : 0,
                        'wholesale_price' => $variant->wholesale_price !== null ? (float) $variant->wholesale_price : 0,
                        'cost_price' => $variant->cost_price !== null ? (float) $variant->cost_price : 0,
                        // NEW: Calculated pricing fields
                        'final_price' => $pricingData['final_price'] ?? $variant->retail_price,
                        'original_price' => $pricingData['original_price'] ?? $variant->retail_price,
                        'discount_percent' => $pricingData['discount_percent'] ?? 0,
                        'discount_amount' => $pricingData['discount_amount'] ?? 0,
                        'display_price' => $pricingData['display_price'] ?? ($pricingData['final_price'] ?? $variant->retail_price),
                        'tax_amount' => $pricingData['tax_amount'] ?? 0,
                        'tax_percent' => $pricingData['tax_percent'] ?? 0,
                        'has_tax' => $pricingData['has_tax'] ?? false,
                        'promotion_id' => $pricingData['promotion_id'] ?? null,
                        'promotion_name' => $pricingData['promotion_name'] ?? null,
                        'promotion_type' => !empty($pricingData['applied_promotions']) ? $pricingData['applied_promotions'][0]['type'] : null,
                        // Existing fields
                        'stock_quantity' => $stockQuantity,
                        'image' => $variant->image,
                        'album' => $variant->album,
                        'barcode' => $variant->barcode,
                        'attributes' => $attributesMap,
                        'warehouse_stocks' => $warehouseStocks,
                    ];
                })->values();
            }, []),
            'warehouse_stocks' => $this->whenLoaded('warehouseStocks', function () use ($tradingData, $incomingData) {
                $isBatchManaged = $this->management_type === 'batch';
                
                if ($isBatchManaged && $this->relationLoaded('batches')) {
                    // For batch-managed product: aggregate from batches
                    $warehouseAggregated = [];
                    foreach ($this->batches as $batch) {
                        if ($batch->relationLoaded('warehouseStocks')) {
                            foreach ($batch->warehouseStocks as $batchStock) {
                                if (!$batchStock) continue;
                                $wid = (int) $batchStock->warehouse_id;
                                
                                if (!isset($warehouseAggregated[$wid])) {
                                    $warehouseAggregated[$wid] = [
                                        'warehouse_id' => $wid,
                                        'stock_quantity' => 0,
                                        'trading_quantity' => (int) ($tradingData['product'][$this->id][$wid] ?? 0),
                                        'incoming_quantity' => (int) ($incomingData['product'][$this->id][$wid] ?? 0),
                                        'storage_location' => $batchStock->storage_location ?? null,
                                    ];
                                }
                                $warehouseAggregated[$wid]['stock_quantity'] += (int) ($batchStock->stock_quantity ?? 0);
                            }
                        }
                    }
                    
                    return array_values($warehouseAggregated);
                }
                
                // For basic product
                return $this->warehouseStocks->map(function ($stock) use ($tradingData, $incomingData) {
                    $pid = (int) $this->id;
                    $wid = (int) $stock->warehouse_id;
                    $stockQty = (int) ($stock->stock_quantity ?? 0);
                    return [
                        'warehouse_id' => $wid,
                        'stock_quantity' => $stockQty,
                        'trading_quantity' => (int) ($tradingData['product'][$pid][$wid] ?? 0),
                        'available_quantity' => $stockQty, // Đảm bảo bằng Tồn kho như yêu cầu
                        'incoming_quantity' => (int) ($incomingData['product'][$pid][$wid] ?? 0),
                        'storage_location' => $stock->storage_location,
                    ];
                })->values();
            }, []),
            // Translation status - danh sách language IDs mà product đã dịch
            'translated_language_ids' => $this->whenLoaded('languages', function(){
                return $this->languages->pluck('id')->toArray();
            }, []),
            // Stock quantity - tổng tồn kho
            'stock_quantity' => $this->getStockQuantity(),
            // Reviews data
            // Reviews data
            'reviews_count' => $this->whenLoaded('reviews', function () {
                return $this->reviews->where('publish', 2)->count();
            }, 0),
            'average_rating' => $this->whenLoaded('reviews', function () {
                $publishedReviews = $this->reviews->where('publish', 2);
                if ($publishedReviews->count() > 0) {
                    return round($publishedReviews->avg('score'), 1);
                }
                return 5.0; // Default to 5.0 if no reviews
            }, 5.0),
            // Variant count - số phiên bản
            'variant_count' => $this->whenLoaded('variants', function () {
                return $this->variants->count();
            }, 0),
            // Attribute catalogues - grouped for variant selection
            'attribute_catalogues' => $this->whenLoaded('variants', function () {
                if ($this->variants->isEmpty()) {
                    return [];
                }
                
                // Collect all unique attribute catalogues from variants
                $catalogues = [];
                foreach ($this->variants as $variant) {
                    if (!$variant->relationLoaded('attributes')) continue;
                    
                    foreach ($variant->attributes as $attribute) {
                        if (!$attribute->relationLoaded('attribute_catalogue')) continue;
                        
                        $catalogue = $attribute->attribute_catalogue;
                        
                        // CRITICAL FIX: Check if catalogue exists before accessing properties
                        if (!$catalogue) continue;
                        
                        $catalogueId = $catalogue->id;
                        
                        // Get catalogue name from current language
                        $catalogueName = null;
                        $catalogueOrder = $catalogue->order ?? 999;
                        
                        if ($catalogue->relationLoaded('current_languages') && $catalogue->current_languages->isNotEmpty()) {
                            $catalogueName = $catalogue->current_languages->first()?->pivot?->name;
                        }
                        
                        // Initialize catalogue if not exists
                        if (!isset($catalogues[$catalogueId])) {
                            $catalogues[$catalogueId] = [
                                'id' => $catalogueId,
                                'name' => $catalogueName ?? 'Attribute ' . $catalogueId,
                                'type' => $catalogue->type ?? null,
                                'order' => $catalogueOrder,
                                'values' => [],
                            ];
                        }
                        
                        // Add attribute value if not already in list
                        $attrId = $attribute->id;
                        if (!isset($catalogues[$catalogueId]['values'][$attrId])) {
                            // Get attribute name from current language
                            $attrName = null;
                            if ($attribute->relationLoaded('current_languages') && $attribute->current_languages->isNotEmpty()) {
                                $attrName = $attribute->current_languages->first()?->pivot?->name;
                            }
                            
                            $catalogues[$catalogueId]['values'][$attrId] = [
                                'id' => $attrId,
                                'value' => $attribute->value ?? '',
                                'name' => $attrName ?? $attribute->value,
                                'color_code' => $attribute->color_code ?? null,
                                'order' => $attribute->order ?? 999,
                            ];
                        }
                    }
                }
                
                // Sort catalogues by order and convert values to arrays
                usort($catalogues, fn($a, $b) => $a['order'] <=> $b['order']);
                
                // Convert values keyed arrays to indexed arrays and sort
                foreach ($catalogues as &$catalogue) {
                    $catalogue['values'] = array_values($catalogue['values']);
                    usort($catalogue['values'], fn($a, $b) => $a['order'] <=> $b['order']);
                }
                
                return array_values($catalogues);
            }, []),
        ];
    }

    /**
     * Get Trading quantity (Đang giao dịch) for Product/Variants per Warehouse
     * Logic: Orders not paid (unpaid) joined with stock logs (export)
     */
    private function getTradingQuantityData(): array
    {
        $unpaidOrderIds = \App\Models\Order::where('payment_status', 'unpaid')
            ->whereNotIn('order_status', ['cancelled', 'completed']) // Loại bỏ cả đơn đã hoàn thành
            ->pluck('id')
            ->map(fn($id) => (string)$id)
            ->toArray();

        if (empty($unpaidOrderIds)) {
            return ['product' => [], 'variant' => []];
        }

        $trading = ['product' => [], 'variant' => []];

        // 1. Basic Product Logs
        $productLogs = \Illuminate\Support\Facades\DB::table('product_warehouse_stock_logs')
            ->whereIn('reference_id', $unpaidOrderIds)
            ->where('reference_type', 'App\Models\Order')
            ->where('transaction_type', 'export')
            ->select('product_id', 'warehouse_id', \Illuminate\Support\Facades\DB::raw('SUM(ABS(change_stock)) as qty'))
            ->groupBy('product_id', 'warehouse_id')
            ->get();
            
        foreach ($productLogs as $log) {
            $pid = (int) $log->product_id;
            $wid = (int) $log->warehouse_id;
            $trading['product'][$pid][$wid] = (int)$log->qty;
        }

        // 2. Variant Logs
        $variantLogs = \Illuminate\Support\Facades\DB::table('product_variant_warehouse_stock_logs')
            ->whereIn('reference_id', $unpaidOrderIds)
            ->where('reference_type', 'App\Models\Order')
            ->where('transaction_type', 'export')
            ->select('product_variant_id', 'warehouse_id', \Illuminate\Support\Facades\DB::raw('SUM(ABS(change_stock)) as qty'))
            ->groupBy('product_variant_id', 'warehouse_id')
            ->get();

        foreach ($variantLogs as $log) {
            $vid = (int) $log->product_variant_id;
            $wid = (int) $log->warehouse_id;
            $trading['variant'][$vid][$wid] = (int)$log->qty;
        }

        // 3. Batch logs
        $batchLogs = \Illuminate\Support\Facades\DB::table('product_batch_stock_logs')
            ->whereIn('reference_id', $unpaidOrderIds)
            ->where('reference_type', 'App\Models\Order')
            ->where('transaction_type', 'export')
            ->select('product_id', 'product_variant_id', 'warehouse_id', \Illuminate\Support\Facades\DB::raw('SUM(ABS(change_stock)) as qty'))
            ->groupBy('product_id', 'product_variant_id', 'warehouse_id')
            ->get();

        foreach ($batchLogs as $log) {
            $wid = (int) $log->warehouse_id;
            if ($log->product_variant_id) {
                $vid = (int) $log->product_variant_id;
                $trading['variant'][$vid][$wid] = ($trading['variant'][$vid][$wid] ?? 0) + (int)$log->qty;
            } else {
                $pid = (int) $log->product_id;
                $trading['product'][$pid][$wid] = ($trading['product'][$pid][$wid] ?? 0) + (int)$log->qty;
            }
        }

        return $trading;
    }

    /**
     * Get Incoming quantity (Hàng đang về) for Product/Variants per Warehouse
     * Logic: ImportOrders not completed joined with import order items
     */
    private function getIncomingQuantityData(): array
    {
        $incoming = ['product' => [], 'variant' => []];

        $logs = \Illuminate\Support\Facades\DB::table('import_order_items')
            ->join('import_orders', 'import_order_items.import_order_id', '=', 'import_orders.id')
            ->whereIn('import_orders.status', ['draft', 'pending'])
            ->whereNull('import_orders.deleted_at')
            ->select('import_order_items.product_id', 'import_order_items.product_variant_id', 'import_orders.warehouse_id', 'import_order_items.quantity')
            ->get();

        foreach ($logs as $log) {
            $wid = $log->warehouse_id;
            $qty = (int)$log->quantity;
            
            if ($log->product_variant_id) {
                if (!isset($incoming['variant'][$log->product_variant_id])) $incoming['variant'][$log->product_variant_id] = [];
                $incoming['variant'][$log->product_variant_id][$wid] = ($incoming['variant'][$log->product_variant_id][$wid] ?? 0) + $qty;
            } else {
                if (!isset($incoming['product'][$log->product_id])) $incoming['product'][$log->product_id] = [];
                $incoming['product'][$log->product_id][$wid] = ($incoming['product'][$log->product_id][$wid] ?? 0) + $qty;
            }
        }

        return $incoming;
    }
}

