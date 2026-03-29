<?php

namespace App\Services\Impl\V1\Promotion;

use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

/**
 * Service tính toán giá khuyến mãi
 * 
 * Xử lý tính toán giá sản phẩm khi áp dụng các chương trình khuyến mãi.
 * Quản lý logic gộp khuyến mãi.
 */
class PromotionPricingService
{
    private ?Collection $activePromotionsCache = null;
    private array $productCatalogueCache = [];
    private array $directPromotionsCache = [];
    private array $cataloguePromotionsCache = [];
    private bool $cacheInitialized = false;

    private static ?Collection $staticActivePromotionsCache = null;
    private static array $staticProductCatalogueCache = [];
    private static array $staticDirectPromotionsCache = [];
    private static array $staticCataloguePromotionsCache = [];
    private static bool $staticCacheInitialized = false;

    public function __construct()
    {
        if (self::$staticCacheInitialized) {
            $this->activePromotionsCache = self::$staticActivePromotionsCache;
            $this->productCatalogueCache = self::$staticProductCatalogueCache;
            $this->directPromotionsCache = self::$staticDirectPromotionsCache;
            $this->cataloguePromotionsCache = self::$staticCataloguePromotionsCache;
            $this->cacheInitialized = true;
        }
    }

    /**
     * Inject dữ liệu danh mục sản phẩm đã load sẵn từ bên ngoài
     * Tránh query lại khi dữ liệu đã có sẵn
     */
    public static function injectProductCatalogueCache(array $data): void
    {
        foreach ($data as $productId => $catalogueIds) {
            if (!isset(self::$staticProductCatalogueCache[$productId])) {
                self::$staticProductCatalogueCache[$productId] = $catalogueIds;
            }
        }
    }

    /**
     * Pre-load dữ liệu khuyến mãi cho một danh sách sản phẩm
     * Gọi hàm này trước khi xử lý nhiều sản phẩm để tránh N+1 queries
     */
    public function preloadForProducts(array $productIds): void
    {
        if (empty($productIds)) {
            return;
        }

        // 1. Load active promotions into static cache if not already done
        if (self::$staticActivePromotionsCache === null) {
            self::$staticActivePromotionsCache = Promotion::where('publish', 2)
                ->whereIn('type', ['product_discount', 'combo']) // MODIFIED: Include combo for same_price
                ->expiryStatus('active')
                ->where(function ($q) {
                    $q->where('start_date', '<=', now())
                        ->orWhereNull('start_date');
                })
                ->get()
                ->keyBy('id');
        }
        $this->activePromotionsCache = self::$staticActivePromotionsCache;

        // 2. Load associations for these products
        $productsMissingCatalogues = array_diff($productIds, array_keys(self::$staticProductCatalogueCache));
        $productsMissingDirectPromos = array_diff($productIds, array_keys(self::$staticDirectPromotionsCache));

        // Load missing catalogue mappings
        if (!empty($productsMissingCatalogues)) {
            $productCatalogues = DB::table('product_catalogue_product')
                ->whereIn('product_id', $productsMissingCatalogues)
                ->get()
                ->groupBy('product_id');

            foreach ($productCatalogues as $productId => $catalogues) {
                self::$staticProductCatalogueCache[$productId] = $catalogues->pluck('product_catalogue_id')->toArray();
            }
            
            // Ensure even products without catalogues are marked as loaded
            foreach ($productsMissingCatalogues as $id) {
                if (!isset(self::$staticProductCatalogueCache[$id])) {
                    self::$staticProductCatalogueCache[$id] = [];
                }
            }
        }

        // Load missing direct assignments
        if (!empty($productsMissingDirectPromos)) {
            $directPromos = DB::table('promotion_product_variant')
                ->whereIn('product_id', $productsMissingDirectPromos)
                ->get()
                ->groupBy('product_id');

            foreach ($directPromos as $productId => $promos) {
                self::$staticDirectPromotionsCache[$productId] = $promos; 
            }

            // Ensure even products without direct promos are marked as loaded
            foreach ($productsMissingDirectPromos as $id) {
                if (!isset(self::$staticDirectPromotionsCache[$id])) {
                    self::$staticDirectPromotionsCache[$id] = collect([]);
                }
            }
        }

        // Load missing catalogue assignments for all active catalogue IDs
        $allCatalogueIds = collect(self::$staticProductCatalogueCache)
            ->only($productIds)
            ->flatten()
            ->unique()
            ->diff(array_keys(self::$staticCataloguePromotionsCache))
            ->toArray();

        if (!empty($allCatalogueIds)) {
            $cataloguePromotions = DB::table('promotion_product_catalogue')
                ->whereIn('product_catalogue_id', $allCatalogueIds)
                ->get()
                ->groupBy('product_catalogue_id');

            foreach ($cataloguePromotions as $catalogueId => $promos) {
                self::$staticCataloguePromotionsCache[$catalogueId] = $promos->pluck('promotion_id')->toArray();
            }
            
            // Mark empty catalogues as loaded
            foreach ($allCatalogueIds as $cid) {
                if (!isset(self::$staticCataloguePromotionsCache[$cid])) {
                    self::$staticCataloguePromotionsCache[$cid] = [];
                }
            }
        }

        $this->productCatalogueCache = self::$staticProductCatalogueCache;
        $this->directPromotionsCache = self::$staticDirectPromotionsCache;
        $this->cataloguePromotionsCache = self::$staticCataloguePromotionsCache;

        $this->cacheInitialized = true;
        self::$staticCacheInitialized = true;
    }

    /**
     * UNIFIED PRICING ENTRY POINT (Internal helper)
     */
    protected function calculateUnifiedPrice($entity, int $quantity = 1, bool $includeTax = false, ?int $variantId = null): array
    {
        // 1. Resolve entity
        $isProductObject = $entity instanceof \App\Models\Product;
        $isVariantObject = $entity instanceof \App\Models\ProductVariant;
        
        $productModel = null;
        $variantModel = null;
        $actualVariantId = $variantId;
        $actualProductId = null;

        if ($isProductObject) {
            $productModel = $entity;
            $actualProductId = $entity->id;
        } elseif ($isVariantObject) {
            $variantModel = $entity;
            $productModel = $entity->product;
            $actualVariantId = $entity->id;
            $actualProductId = $entity->product_id;
        } elseif (is_int($entity)) {
            $productModel = Product::find($entity);
            $actualProductId = $entity;
        }

        if (!$productModel) {
            return $this->emptyPriceResult(0);
        }

        $retailPrice = (float) ( ($variantModel ? $variantModel->retail_price : $productModel->retail_price) ?? 0 );
        
        // Fallback for variant price 0
        if ($variantModel && $retailPrice <= 0) {
            $retailPrice = (float) ($productModel->retail_price ?? 0);
        }

        if ($retailPrice <= 0) {
            return $this->emptyPriceResult(0);
        }

        // 2. Identify all applicable promotions
        $promotions = $this->getActivePromotionsForProduct($actualProductId, $actualVariantId);
        
        $promotionsWithDiscount = $promotions->map(function ($promo) use ($retailPrice) {
            $discountAmount = $this->calculateDiscountAmount($retailPrice, $promo);
            return [
                'promotion' => $promo,
                'discount_amount' => $discountAmount,
                'can_combine' => (bool) $promo->combine_with_product_discount,
                'end_date' => $promo->end_date,
                'no_end_date' => (bool) $promo->no_end_date,
            ];
        });

        $combinable = $promotionsWithDiscount->filter(fn($p) => $p['can_combine']);
        $nonCombinable = $promotionsWithDiscount->filter(fn($p) => !$p['can_combine']);

        // 3. PRIORITY 1: Same Price (Đồng giá)
        $samePrices = $nonCombinable->filter(fn($p) => $p['promotion']->discount_type === 'same_price');
        if ($samePrices->isNotEmpty()) {
            $bestSamePrice = $samePrices->sortByDesc('discount_amount')->first();
            $result = $this->finalizePricingArray($this->buildPricingResult($retailPrice, $bestSamePrice['discount_amount'], [$bestSamePrice], false), $retailPrice);
            if ($includeTax) $result = $this->addTaxToResult($result, $variantModel ?: $productModel);
            return $result;
        }

        // 4. PRIORITY 2: Wholesale Tiers
        $pricingTiers = $productModel->pricingTiers ?? collect([]);
        if ($pricingTiers->isNotEmpty()) {
            $tierPrice = $this->calculateWholesaleTierPrice($pricingTiers, $quantity);
            if ($tierPrice !== null) {
                $result = [
                    'original_price' => $retailPrice,
                    'final_price' => $tierPrice,
                    'discount_amount' => $retailPrice - $tierPrice,
                    'discount_percent' => $retailPrice > 0 ? round((($retailPrice - $tierPrice) / $retailPrice) * 100, 2) : 0,
                    'applied_promotions' => [],
                    'is_wholesale_tier' => true,
                    'has_discount' => $tierPrice < $retailPrice,
                    'promotion_id' => null,
                    'promotion_name' => null,
                ];
                if ($includeTax) $result = $this->addTaxToResult($result, $variantModel ?: $productModel);
                return $result;
            }
        }

        // 5. PRIORITY 3: Standard Discounts (Combinable or best non-combinable)
        $combinedDiscount = min($combinable->sum('discount_amount'), $retailPrice);
        $bestSingle = $nonCombinable->sortByDesc('discount_amount')->first();
        $bestSingleDiscount = $bestSingle['discount_amount'] ?? 0;

        $finalPromoResult = null;
        if ($combinedDiscount >= $bestSingleDiscount && $combinedDiscount > 0) {
            $finalPromoResult = $this->buildPricingResult($retailPrice, $combinedDiscount, $combinable->toArray(), count($combinable) > 1);
        } elseif ($bestSingleDiscount > 0) {
            $finalPromoResult = $this->buildPricingResult($retailPrice, $bestSingleDiscount, [$bestSingle], false);
        } else {
            $finalPromoResult = $this->emptyPriceResult($retailPrice);
        }

        $result = $this->finalizePricingArray($finalPromoResult, $retailPrice);
        if ($includeTax) $result = $this->addTaxToResult($result, $variantModel ?: $productModel);
        return $result;
    }

    /**
     * API: Calculate price based ONLY on promotions (backward compatibility)
     */
    public function calculateProductPrice($product, ?float $basePrice = null, ?int $variantId = null): array
    {
        // We use the unified logic but ignore wholesale by fixing quantity to 1
        // (Wholesale tiers only apply if quantity matches, but Same Price takes precedence anyway)
        return $this->calculateUnifiedPrice($product, 1, false, $variantId);
    }

    /**
     * API: Calculate final price with ALL factors (Full detail / Cart)
     */
    public function calculateFinalPrice($entity, int $quantity = 1, bool $includeTax = false): array
    {
        return $this->calculateUnifiedPrice($entity, $quantity, $includeTax);
    }

    /**
     * Láy tất cả khuyến mãi đang active áp dụng cho sản phẩm
     */
    public function getActivePromotionsForProduct(int $productId, ?int $variantId = null): Collection
    {
        if ($this->cacheInitialized) {
            return $this->getActivePromotionsFromCache($productId, $variantId);
        }

        return $this->getActivePromotionsFromDatabase($productId, $variantId);
    }

    /**
     * Lấy khuyến mãi từ cache đã preload (tối ưu - KHÔNG QUERY DB LẠI)
     */
    private function getActivePromotionsFromCache(int $productId, ?int $variantId = null): Collection
    {
        $promoIds = collect([]);

        // 1. apply_source = 'all'
        $allPromotions = $this->activePromotionsCache->where('apply_source', 'all');
        $promoIds = $promoIds->merge($allPromotions->pluck('id'));

        // 2. Direct assignments (Using pre-loaded records to avoid DB query)
        $directRecords = self::$staticDirectPromotionsCache[$productId] ?? collect([]);
        foreach ($directRecords as $v) {
            if ($variantId) {
                if ($v->product_variant_id == $variantId || is_null($v->product_variant_id)) {
                    $promoIds->push($v->promotion_id);
                }
            } else {
                if (is_null($v->product_variant_id)) {
                    $promoIds->push($v->promotion_id);
                }
            }
        }

        // 3. Catalogue assignments
        $catalogueIds = $this->productCatalogueCache[$productId] ?? [];
        foreach ($catalogueIds as $catalogueId) {
            $cataloguePromoIds = $this->cataloguePromotionsCache[$catalogueId] ?? [];
            $promoIds = $promoIds->merge($cataloguePromoIds);
        }

        $promoIds = $promoIds->unique();
        if ($promoIds->isEmpty()) {
            return collect([]);
        }

        return $this->activePromotionsCache->whereIn('id', $promoIds->toArray())->values();
    }

    /**
     * Lấy khuyến mãi từ database (không cache)
     */
    private function getActivePromotionsFromDatabase(int $productId, ?int $variantId = null): Collection
    {
        $activePromotions = Promotion::where('publish', 2)
            ->whereIn('type', ['product_discount', 'combo']) // MODIFIED: Include combo
            ->expiryStatus('active')
            ->where(function ($q) {
                $q->where('start_date', '<=', now())
                    ->orWhereNull('start_date');
            })
            ->get();

        $applicablePromoIds = collect([]);

        foreach ($activePromotions as $promo) {
            if ($promo->apply_source === 'all') {
                $applicablePromoIds->push($promo->id);
                continue;
            }

            if ($promo->apply_source === 'product_variant') {
                $hasDirectAssignment = DB::table('promotion_product_variant')
                    ->where('promotion_id', $promo->id)
                    ->where('product_id', $productId)
                    ->where(function($q) use ($variantId) {
                        if ($variantId) {
                            $q->where('product_variant_id', $variantId)
                              ->orWhereNull('product_variant_id');
                        } else {
                            $q->whereNull('product_variant_id');
                        }
                    })
                    ->exists();

                if ($hasDirectAssignment) {
                    $applicablePromoIds->push($promo->id);
                    continue;
                }
            }

            if ($promo->apply_source === 'product_catalogue') {
                $productCatalogueIds = DB::table('product_catalogue_product')
                    ->where('product_id', $productId)
                    ->pluck('product_catalogue_id');

                if ($productCatalogueIds->isNotEmpty()) {
                    $hasCatalogueAssignment = DB::table('promotion_product_catalogue')
                        ->where('promotion_id', $promo->id)
                        ->whereIn('product_catalogue_id', $productCatalogueIds)
                        ->exists();

                    if ($hasCatalogueAssignment) {
                        $applicablePromoIds->push($promo->id);
                    }
                }
            }
        }

        return $activePromotions->whereIn('id', $applicablePromoIds->unique())->values();
    }


    /**
     * Tính toán số tiền giảm giá cho một chương trình khuyến mãi cụ thể
     */
    public function calculateDiscountAmount(float $price, Promotion $promotion): float
    {
        $discountAmount = 0;

        if ($promotion->discount_type === 'percentage') {
            $discountAmount = $price * ($promotion->discount_value / 100);

            $maxDiscount = (float) $promotion->max_discount_value;
            if ($maxDiscount > 0 && $discountAmount > $maxDiscount) {
                $discountAmount = $maxDiscount;
            }
        } elseif ($promotion->discount_type === 'fixed_amount') {
            $discountAmount = $promotion->discount_value;
        } elseif ($promotion->discount_type === 'same_price') {
            // Use combo_price if set, otherwise fallback to discount_value (Product-level same_price usually uses discount_value)
            $targetPrice = (float) (($promotion->combo_price > 0) ? $promotion->combo_price : ($promotion->discount_value ?? 0));

            // Only apply if target price is lower than current price
            if ($targetPrice > 0 && $targetPrice < $price) {
                $discountAmount = $price - $targetPrice;
            } else {
                $discountAmount = 0;
            }
        }

        return min(max($discountAmount, 0), $price);
    }

    /**
     * Helper to build pricing result object
     */
    private function buildPricingResult(float $original, float $discount, array $promos, bool $isCombined): array
    {
        $final = max($original - $discount, 0);
        $applied = array_map(function($p) {
            $promo = isset($p['promotion']) ? $p['promotion'] : $p;
            $pDiscount = isset($p['discount_amount']) ? $p['discount_amount'] : 0;
            
            return [
                'id' => $promo->id,
                'name' => $promo->name,
                'discount' => $pDiscount,
                'type' => $promo->discount_type,
                'value' => $promo->discount_type === 'same_price' ? (($promo->combo_price > 0) ? $promo->combo_price : $promo->discount_value) : $promo->discount_value,
            ];
        }, $promos);

        return [
            'original_price' => $original,
            'final_price' => $final,
            'discount_amount' => $discount,
            'discount_percent' => $original > 0 ? (int)round(($discount / $original) * 100) : 0,
            'applied_promotions' => $applied,
            'is_combined' => $isCombined,
            'has_discount' => $discount > 0,
        ];
    }

    /**
     * Calculate price from wholesale pricing tiers based on quantity
     */
    private function calculateWholesaleTierPrice($tiers, int $quantity): ?float
    {
        $applicableTier = null;
        
        foreach ($tiers as $tier) {
            $min = (int)($tier->min_quantity ?? 0);
            $max = $tier->max_quantity !== null ? (int)$tier->max_quantity : null;
            
            if ($quantity >= $min) {
                if ($max === null || $quantity <= $max) {
                    if ($applicableTier === null || $min >= (int)$applicableTier->min_quantity) {
                        $applicableTier = $tier;
                    }
                }
            }
        }

        return $applicableTier ? (float) $applicableTier->price : null;
    }

    /**
     * Trả về kết quả giá trống
     */
    private function emptyPriceResult(float $price): array
    {
        return [
            'original_price' => $price,
            'final_price' => $price,
            'discount_amount' => 0,
            'discount_percent' => 0,
            'applied_promotions' => [],
            'is_combined' => false,
            'has_discount' => false,
        ];
    }
    private function finalizePricingArray(array $promotionResult, float $retailPrice): array
    {
        return [
            'original_price' => $promotionResult['original_price'] ?? $retailPrice,
            'final_price' => $promotionResult['final_price'] ?? $retailPrice,
            'discount_amount' => $promotionResult['discount_amount'] ?? 0,
            'discount_percent' => $promotionResult['discount_percent'] ?? 0,
            'applied_promotions' => $promotionResult['applied_promotions'] ?? [],
            'is_wholesale_tier' => $promotionResult['is_wholesale_tier'] ?? false,
            'is_combined' => $promotionResult['is_combined'] ?? false,
            'has_discount' => ($promotionResult['discount_amount'] ?? 0) > 0,
            'promotion_id' => !empty($promotionResult['applied_promotions']) ? $promotionResult['applied_promotions'][0]['id'] ?? null : null,
            'promotion_name' => !empty($promotionResult['applied_promotions']) ? $promotionResult['applied_promotions'][0]['name'] ?? null : null,
        ];
    }

    /**
     * Add tax calculation to pricing result
     */
    private function addTaxToResult(array $result, $entity): array
    {
        // Get tax info from entity or parent product
        $applyTax = false;
        $taxRate = 0;

        if ($entity instanceof \App\Models\Product) {
            $applyTax = (bool) ($entity->apply_tax ?? false);
            $taxRate = (float) ($entity->sale_tax_rate ?? 0);
        } elseif ($entity instanceof \App\Models\ProductVariant) {
            $product = $entity->product;
            if ($product) {
                $applyTax = (bool) ($product->apply_tax ?? false);
                $taxRate = (float) ($product->sale_tax_rate ?? 0);
            }
        }

        $taxAmount = 0;
        $displayPrice = $result['final_price'];

        if ($applyTax && $taxRate > 0) {
            $taxAmount = round($result['final_price'] * ($taxRate / 100), 0); // Round to nearest dong
            $displayPrice = $result['final_price'] + $taxAmount;
        }

        $result['tax_amount'] = $taxAmount;
        $result['tax_percent'] = $taxRate;
        $result['has_tax'] = $applyTax && $taxRate > 0;
        $result['display_price'] = $displayPrice;

        return $result;
    }

    /**
     * Lấy các chương trình Mua X Tặng Y có liên quan đến sản phẩm này
     * Trả về kết quả đã được phân loại thành "Quà tặng miễn phí" và "Sản phẩm giảm giá"
     */
    public function getBuyXGetYCategorized($entity): array
    {
        $promos = $this->getBuyXGetYForProduct($entity);
        
        $freeGifts = [];
        $discounts = [];
        
        foreach ($promos as $promo) {
            // Phân loại: Nếu discount_type là free hoặc discount_value là 100
            $isFree = ($promo['discount_type'] === 'free' || (int)$promo['discount_value'] === 100);
            
            $item = [
                'id' => $promo['id'],
                'name' => $promo['name'],
                'description' => $promo['description'],
                'rewards' => $promo['reward_details'] ?? [],
                // Thêm thông tin điều kiện để Frontend hiển thị (Ví dụ: Mua 2 Tặng 1)
                'buy_qty' => collect($promo['buy_x_get_y_items'])->where('item_type', 'buy')->sum('quantity'),
            ];
            
            if ($isFree) {
                $freeGifts[] = $item;
            } else {
                $discounts[] = $item;
            }
        }
        
        return [
            'free_gifts' => $freeGifts,
            'discounts' => $discounts
        ];
    }

    /**
     * Lấy danh sách các Combo mà sản phẩm này là thành viên
     */
    public function getCombosForProduct($entity): Collection
    {
        if (is_numeric($entity)) {
            $entity = Product::with('product_catalogues')->find($entity);
        }

        if (!$entity) return collect([]);

        $isVariant = $entity instanceof \App\Models\ProductVariant;
        $product = $isVariant ? $entity->product : $entity;
        
        if (!$product) return collect([]);

        $productId = $product->id;
        $variantId = $isVariant ? $entity->id : null;
        $catalogueIds = $product->product_catalogues->pluck('id')->toArray();

        // 1. Lấy tất cả Combo đang hoạt động
        $combos = Promotion::where('publish', 2)
            ->where('type', 'combo')
            ->expiryStatus('active')
            ->where(function ($q) {
                $q->where('start_date', '<=', now())
                    ->orWhereNull('start_date');
            })
            ->with(['combo_items.product', 'combo_items.product_variant.attributes.attribute_catalogue.current_languages', 'combo_items.product_variant.product'])
            ->get();

        $applicableCombos = collect([]);

        foreach ($combos as $combo) {
            $isMatch = false;

            // NEW: Kiểm tra xem sản phẩm đang xem có nằm TRONG danh sách các mặt hàng của Combo không
            foreach ($combo->combo_items as $item) {
                if ($item->product_id == $productId) {
                    if ($variantId) {
                        // Nếu đang xem variant cụ thể, thì combo phải chứa variant đó 
                        // HOẶC combo chứa product gốc nhưng không chỉ định variant (áp dụng cho tất cả variant)
                        if ($item->product_variant_id == $variantId || is_null($item->product_variant_id)) {
                            $isMatch = true;
                            break;
                        }
                    } else {
                        // Nếu đang xem sản phẩm chung, chỉ cần match product_id
                        $isMatch = true;
                        break;
                    }
                }
            }

            if ($isMatch) {
                // Lấy CHI TIẾT các sản phẩm trong Combo này để show popup
                $comboProducts = [];
                
                foreach ($combo->combo_items as $item) {
                    $p = $item->product;
                    if (!$p) continue;
                    
                    $v = $item->product_variant;
                    
                        $comboProducts[] = [
                            'id' => $p->id,
                            'variant_id' => $v ? $v->id : null,
                            'name' => $v ? $v->variant_name : $p->name,
                            'canonical' => $p->current_languages->first()?->pivot?->canonical,
                            'image' => $v ? ($v->image ?: $p->image) : $p->image,
                            'retail_price' => $v ? $v->retail_price : $p->retail_price,
                            'sku' => $v ? $v->sku : $p->sku,
                            'quantity' => $item->quantity,
                        ];
                }
                
                // Trả về mảng thay vì Model để tránh mất dữ liệu khi Inertia serialize
                $applicableCombos->push([
                    'id' => $combo->id,
                    'name' => $combo->name,
                    'description' => $combo->description,
                    'combo_price' => $combo->combo_price,
                    'image' => $combo->image,
                    'combo_products' => $comboProducts,
                    'type' => $combo->type,
                ]);
            }
        }

        return $applicableCombos;
    }

    /**
     * Lấy các chương trình Mua X Tặng Y có liên quan đến sản phẩm này
     * (Sản phẩm này đóng vai trò là "Mua X")
     */
    public function getBuyXGetYForProduct($entity): Collection
    {
        if (is_numeric($entity)) {
            $entity = Product::with('product_catalogues')->find($entity);
        }

        if (!$entity) return collect([]);

        $isVariant = $entity instanceof \App\Models\ProductVariant;
        $product = $isVariant ? $entity->product : $entity;
        
        if (!$product) return collect([]);

        $productId = $product->id;
        $variantId = $isVariant ? $entity->id : null;
        $catalogueIds = $product->product_catalogues->pluck('id')->toArray();
        
        // 1. Lấy tất cả khuyến mãi Buy X Get Y đang active
        $promotions = Promotion::where('publish', 2)
            ->where('type', 'buy_x_get_y')
            ->expiryStatus('active')
            ->where(function ($q) {
                $q->where('start_date', '<=', now())
                    ->orWhereNull('start_date');
            })
            ->with('buy_x_get_y_items')
            ->get();

        $applicablePromos = collect([]);

        foreach ($promotions as $promo) {
            $buyItems = $promo->buy_x_get_y_items->where('item_type', 'buy');
            
            $isMatch = false;
            foreach ($buyItems as $item) {
                if ($item->apply_type === 'product' && $item->product_id == $productId) {
                    $isMatch = true;
                    break;
                }

                if ($item->apply_type === 'product_variant' && $variantId && $item->product_variant_id == $variantId) {
                    $isMatch = true;
                    break;
                }
                
                if ($item->apply_type === 'product_catalogue') {
                    if (in_array($item->product_catalogue_id, $catalogueIds)) {
                        $isMatch = true;
                        break;
                    }
                }
            }

            if ($isMatch) {
                // Đính kèm thêm thông tin sản phẩm "Tặng Y" để Frontend hiển thị
                $getItems = $promo->buy_x_get_y_items->where('item_type', 'get');
                $rewardDetails = [];
                
                foreach ($getItems as $getItem) {
                    $giftEntity = null;
                    if ($getItem->apply_type === 'product') {
                        $giftEntity = Product::with('current_languages')->find($getItem->product_id);
                    } elseif ($getItem->apply_type === 'product_variant') {
                        $giftEntity = \App\Models\ProductVariant::with('product.current_languages')->find($getItem->product_variant_id);
                    }

                    if ($giftEntity) {
                        $isV = $giftEntity instanceof \App\Models\ProductVariant;
                        $giftProduct = $isV ? $giftEntity->product : $giftEntity;

                        $rewardDetails[] = [
                            'product_id' => $giftProduct->id,
                            'variant_id' => $isV ? $giftEntity->id : null,
                            'name' => $isV ? $giftEntity->variant_name : ($giftProduct->name ?? 'Sản phẩm quà tặng'),
                            'canonical' => $giftProduct->current_languages->first()?->pivot?->canonical,
                            'sku' => $giftEntity->sku ?? $giftProduct->sku ?? '',
                            'image' => $giftEntity->image ?: $giftProduct->image,
                            'price' => $giftEntity->retail_price ?? $giftProduct->retail_price,
                            'quantity' => $getItem->quantity,
                            'discount_type' => $promo->discount_type, // free, fixed_amount, percentage
                            'discount_value' => $promo->discount_value,
                        ];
                    }
                }
                
                $applicablePromos->push([
                    'id' => $promo->id,
                    'name' => $promo->name,
                    'description' => $promo->description,
                    'discount_type' => $promo->discount_type,
                    'discount_value' => $promo->discount_value,
                    'reward_details' => $rewardDetails,
                    'buy_x_get_y_items' => $promo->buy_x_get_y_items,
                ]);
            }
        }

        return $applicablePromos;
    }

    /**
     * Lấy danh sách các chương trình khuyến mãi trên tổng đơn hàng đang active
     */
    public function getActiveOrderPromotions(): Collection
    {
        return Promotion::where('publish', 2)
            ->where('type', 'order_discount')
            ->expiryStatus('active')
            ->where(function ($q) {
                $q->where('start_date', '<=', now())
                    ->orWhereNull('start_date');
            })
            ->get();
    }

    /**
     * Tính toán số tiền giảm giá cho khuyến mãi đơn hàng
     */
    public function calculateOrderPromotionDiscount(float $amount, Promotion $promotion): float
    {
        // Kiểm tra điều kiện đơn hàng (nếu có)
        // Hiện tại logic đơn giản là kiểm tra giá trị tối thiểu
        if ($promotion->condition_type === 'min_order_amount') {
            if ($amount < (float)$promotion->condition_value) {
                return 0;
            }
        }

        $discountAmount = 0;
        if ($promotion->discount_type === 'percentage') {
            $discountAmount = $amount * ($promotion->discount_value / 100);
            
            $maxDiscount = (float) $promotion->max_discount_value;
            if ($maxDiscount > 0 && $discountAmount > $maxDiscount) {
                $discountAmount = $maxDiscount;
            }
        } elseif ($promotion->discount_type === 'fixed_amount') {
            $discountAmount = (float) $promotion->discount_value;
        }

        return min(max($discountAmount, 0), $amount);
    }
}
