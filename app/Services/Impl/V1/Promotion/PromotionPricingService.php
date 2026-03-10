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
     * Sử dụng static cache để tránh query lặp lại giữa các instances
     */
    public function preloadForProducts(array $productIds): void
    {
        if (empty($productIds)) {
            return;
        }

        if (self::$staticActivePromotionsCache === null) {
            self::$staticActivePromotionsCache = Promotion::where('publish', 2)
                ->where('type', 'product_discount')
                ->expiryStatus('active')
                ->where(function ($q) {
                    $q->where('start_date', '<=', now())
                        ->orWhereNull('start_date');
                })
                ->get()
                ->keyBy('id');
        }
        $this->activePromotionsCache = self::$staticActivePromotionsCache;

        $newProductIds = array_diff($productIds, array_keys(self::$staticProductCatalogueCache));

        if (!empty($newProductIds)) {
            $productCatalogues = DB::table('product_catalogue_product')
                ->whereIn('product_id', $newProductIds)
                ->get()
                ->groupBy('product_id');

            foreach ($productCatalogues as $productId => $catalogues) {
                self::$staticProductCatalogueCache[$productId] = $catalogues->pluck('product_catalogue_id')->toArray();
            }

            $directPromotions = DB::table('promotion_product_variant')
                ->whereIn('product_id', $newProductIds)
                ->get()
                ->groupBy('product_id');

            foreach ($directPromotions as $productId => $promos) {
                self::$staticDirectPromotionsCache[$productId] = $promos->pluck('promotion_id')->toArray();
            }

            $newCatalogueIds = collect(self::$staticProductCatalogueCache)
                ->only($newProductIds)
                ->flatten()
                ->unique()
                ->diff(array_keys(self::$staticCataloguePromotionsCache))
                ->toArray();

            if (!empty($newCatalogueIds)) {
                $cataloguePromotions = DB::table('promotion_product_catalogue')
                    ->whereIn('product_catalogue_id', $newCatalogueIds)
                    ->get()
                    ->groupBy('product_catalogue_id');

                foreach ($cataloguePromotions as $catalogueId => $promos) {
                    self::$staticCataloguePromotionsCache[$catalogueId] = $promos->pluck('promotion_id')->toArray();
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
     * Tính toán giá cuối cùng của sản phẩm sau khi áp dụng các khuyến mãi
     *
     * @param Product|int $product Model sản phẩm hoặc ID
     * @param float|null $basePrice Giá gốc (nếu null sẽ lấy retail_price của sản phẩm)
     * @return array Kết quả tính toán giá
     */
    public function calculateProductPrice($product, ?float $basePrice = null): array
    {
        if (is_int($product)) {
            $product = Product::find($product);
        }

        if (!$product) {
            return $this->emptyPriceResult(0);
        }

        $originalPrice = $basePrice ?? $product->retail_price ?? 0;

        if ($originalPrice <= 0) {
            return $this->emptyPriceResult(0);
        }

        $promotions = $this->getActivePromotionsForProduct($product->id);

        if ($promotions->isEmpty()) {
            return $this->emptyPriceResult($originalPrice);
        }

        $promotionsWithDiscount = $promotions->map(function ($promo) use ($originalPrice) {
            $discountAmount = $this->calculateDiscountAmount($originalPrice, $promo);
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

        $result = $this->determineBestPricing($originalPrice, $combinable, $nonCombinable);

        return $result;
    }

    /**
     * Lấy tất cả khuyến mãi đang active áp dụng cho sản phẩm
     * Sử dụng cache nếu đã gọi preloadForProducts
     */
    public function getActivePromotionsForProduct(int $productId): Collection
    {
        if ($this->cacheInitialized) {
            return $this->getActivePromotionsFromCache($productId);
        }

        return $this->getActivePromotionsFromDatabase($productId);
    }

    /**
     * Lấy khuyến mãi từ cache đã preload (tối ưu)
     */
    private function getActivePromotionsFromCache(int $productId): Collection
    {
        $promoIds = collect([]);

        // Case 1: Get promotions with apply_source='all'
        $allPromotions = $this->activePromotionsCache->where('apply_source', 'all');
        $promoIds = $promoIds->merge($allPromotions->pluck('id'));

        // Case 2: Direct product/variant assignments
        $directPromoIds = $this->directPromotionsCache[$productId] ?? [];
        $promoIds = $promoIds->merge($directPromoIds);

        // Case 3: Catalogue assignments
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
     * Lấy khuyến mãi từ database (không cache) - CHỈ 1 sản phẩm
     */
    private function getActivePromotionsFromDatabase(int $productId): Collection
    {
        $product = \App\Models\Product::find($productId);

        if (!$product) {
            return collect([]);
        }

        // CRITICAL FIX: Load active promotions including apply_source='all'
        $activePromotions = Promotion::where('publish', 2)
            ->where('type', 'product_discount')
            ->expiryStatus('active')
            ->where(function ($q) {
                $q->where('start_date', '<=', now())
                    ->orWhereNull('start_date');
            })
            ->get();

        $applicablePromoIds = collect([]);

        foreach ($activePromotions as $promo) {
            // Case 1: apply_source = 'all' → applies to EVERYTHING
            if ($promo->apply_source === 'all') {
                $applicablePromoIds->push($promo->id);
                continue;
            }

            // Case 2: Direct product/variant assignment
            if ($promo->apply_source === 'product_variant') {
                $hasDirectAssignment = DB::table('promotion_product_variant')
                    ->where('promotion_id', $promo->id)
                    ->where('product_id', $productId)
                    ->exists();

                if ($hasDirectAssignment) {
                    $applicablePromoIds->push($promo->id);
                    continue;
                }
            }

            // Case 3: Product catalogue assignment
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
            // CRITICAL FIX: Use combo_price (correct field name), not discount_value
            $targetPrice = (float) ($promotion->combo_price ?? 0);

            // Only apply if target price is lower than current price
            if ($targetPrice > 0 && $targetPrice < $price) {
                $discountAmount = $price - $targetPrice;
            } else {
                // Invalid same_price promotion - target price too high or zero
                $discountAmount = 0;
            }
        }

        return min(max($discountAmount, 0), $price);
    }

    /**
     * Xác định phương án giá tốt nhất giữa gộp khuyến mãi và khuyến mãi độc lập
     */
    private function determineBestPricing(float $originalPrice, Collection $combinable, Collection $nonCombinable): array
    {
        // PRIORITY 1: Check for same_price promotions FIRST
        // If exists, use immediately - same_price has ABSOLUTE priority
        $samePricePromo = $nonCombinable->first(function ($promo) {
            return $promo['promotion']->discount_type === 'same_price';
        });

        if ($samePricePromo) {
            $discount = $samePricePromo['discount_amount'];
            $finalPrice = max($originalPrice - $discount, 0);
            $discountPercent = $originalPrice > 0
                ? round(($discount / $originalPrice) * 100, 0)
                : 0;

            return [
                'original_price' => $originalPrice,
                'final_price' => $finalPrice,
                'discount_amount' => $discount,
                'discount_percent' => (int) $discountPercent,
                'applied_promotions' => [[
                    'id' => $samePricePromo['promotion']->id,
                    'name' => $samePricePromo['promotion']->name,
                    'discount' => $discount,
                    'type' => 'same_price',
                    'value' => $samePricePromo['promotion']->combo_price,
                ]],
                'is_combined' => false,
                'has_discount' => $discount > 0,
            ];
        }

        // PRIORITY 2: Compare combinable vs non-combinable (percentage/fixed only)
        $combinedDiscount = 0;
        $combinedPromos = [];

        foreach ($combinable as $promo) {
            $combinedDiscount += $promo['discount_amount'];
            $combinedPromos[] = [
                'id' => $promo['promotion']->id,
                'name' => $promo['promotion']->name,
                'discount' => $promo['discount_amount'],
                'type' => $promo['promotion']->discount_type,
                'value' => $promo['promotion']->discount_value,
            ];
        }

        $bestNonCombinable = null;
        $bestNonCombinableDiscount = 0;

        if ($nonCombinable->isNotEmpty()) {
            $sortedNonCombinable = $nonCombinable->sortBy([
                ['discount_amount', 'desc'],
                ['end_date', 'asc'],
            ])->values();

            $bestNonCombinable = $sortedNonCombinable->first();
            $bestNonCombinableDiscount = $bestNonCombinable['discount_amount'];
        }

        $combinedDiscount = min($combinedDiscount, $originalPrice);

        $useCombined = false;
        $appliedPromotions = [];
        $totalDiscount = 0;

        if ($combinedDiscount >= $bestNonCombinableDiscount) {
            $useCombined = true;
            $totalDiscount = $combinedDiscount;
            $appliedPromotions = $combinedPromos;
        } else {
            $useCombined = false;
            $totalDiscount = $bestNonCombinableDiscount;
            $appliedPromotions = [[
                'id' => $bestNonCombinable['promotion']->id,
                'name' => $bestNonCombinable['promotion']->name,
                'discount' => $bestNonCombinableDiscount,
                'type' => $bestNonCombinable['promotion']->discount_type,
                'value' => $bestNonCombinable['promotion']->discount_value,
            ]];
        }

        if (empty($appliedPromotions)) {
            return $this->emptyPriceResult($originalPrice);
        }

        $finalPrice = max($originalPrice - $totalDiscount, 0);
        $discountPercent = $originalPrice > 0
            ? round(($totalDiscount / $originalPrice) * 100, 0)
            : 0;

        return [
            'original_price' => $originalPrice,
            'final_price' => $finalPrice,
            'discount_amount' => $totalDiscount,
            'discount_percent' => (int) $discountPercent,
            'applied_promotions' => $appliedPromotions,
            'is_combined' => $useCombined && count($appliedPromotions) > 1,
            'has_discount' => $totalDiscount > 0,
        ];
    }

    /**
     * UNIFIED PRICING METHOD
     * Calculate final price with ALL factors: promotions, tax, wholesale tiers
     * Supports both Product and ProductVariant
     * 
     * @param Product|ProductVariant $entity 
     * @param int $quantity For wholesale tier calculation
     * @param bool $includeTax Whether to add tax to final price
     * @return array Complete pricing breakdown
     */
    public function calculateFinalPrice($entity, int $quantity = 1, bool $includeTax = false): array
    {
        // Extract base data
        $isProduct = $entity instanceof \App\Models\Product;
        $isVariant = $entity instanceof \App\Models\ProductVariant;

        if (!$isProduct && !$isVariant) {
            return $this->emptyPriceResult(0);
        }

        $retailPrice = (float) ($entity->retail_price ?? 0);
        $wholesalePrice = (float) ($entity->wholesale_price ?? 0);

        // CRITICAL FIX: If variant price is 0, fallback to parent product price
        if ($isVariant && $retailPrice <= 0) {
            $product = $entity->product;
            if ($product) {
                $retailPrice = (float) ($product->retail_price ?? 0);
                $wholesalePrice = (float) ($product->wholesale_price ?? 0);
            }
        }

        if ($retailPrice <= 0) {
            return $this->emptyPriceResult(0);
        }

        // PRIORITY 1: Check wholesale pricing tiers (Product only - overrides everything)
        if ($isProduct && $entity->pricingTiers && $entity->pricingTiers->isNotEmpty()) {
            $tierPrice = $this->calculateWholesaleTierPrice($entity->pricingTiers, $quantity);

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

            // Add tax if enabled
            if ($includeTax) {
                $result = $this->addTaxToResult($result, $entity);
            }

            return $result;
        }

        // PRIORITY 2: Calculate promotion pricing
        if ($isProduct) {
            $promotionResult = $this->calculateProductPrice($entity, $retailPrice);
        } else {
            // For variant, get promotions via parent product
            $product = $entity->product;
            $promotionResult = $product ? $this->calculateProductPrice($product, $retailPrice) : $this->emptyPriceResult($retailPrice);
        }

        // Normalize promotion result
        $result = [
            'original_price' => $promotionResult['original_price'] ?? $retailPrice,
            'final_price' => $promotionResult['final_price'] ?? $retailPrice,
            'discount_amount' => $promotionResult['discount_amount'] ?? 0,
            'discount_percent' => $promotionResult['discount_percent'] ?? 0,
            'applied_promotions' => $promotionResult['applied_promotions'] ?? [],
            'is_wholesale_tier' => false,
            'has_discount' => ($promotionResult['discount_amount'] ?? 0) > 0,
            'promotion_id' => !empty($promotionResult['applied_promotions']) ? $promotionResult['applied_promotions'][0]['id'] ?? null : null,
            'promotion_name' => !empty($promotionResult['applied_promotions']) ? $promotionResult['applied_promotions'][0]['name'] ?? null : null,
        ];

        // Add tax if enabled
        if ($includeTax) {
            $result = $this->addTaxToResult($result, $entity);
        }

        return $result;
    }

    /**
     * Calculate price from wholesale pricing tiers based on quantity
     */
    private function calculateWholesaleTierPrice($tiers, int $quantity): float
    {
        $sortedTiers = $tiers->sortBy('min_quantity');
        $applicableTier = null;

        foreach ($sortedTiers as $tier) {
            if ($quantity >= $tier->min_quantity) {
                // Check if within max_quantity range (null = unlimited)
                if ($tier->max_quantity === null || $quantity <= $tier->max_quantity) {
                    $applicableTier = $tier;
                }
            }
        }

        // If no tier matches, return the last (highest) tier price
        if (!$applicableTier) {
            $applicableTier = $sortedTiers->last();
        }

        return (float) ($applicableTier->price ?? 0);
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
     * Trả về kết quả giá mặc định (không giảm giá)
     */
    private function emptyPriceResult(float $originalPrice): array
    {
        return [
            'original_price' => $originalPrice,
            'final_price' => $originalPrice,
            'discount_amount' => 0,
            'discount_percent' => 0,
            'applied_promotions' => [],
            'is_combined' => false,
            'has_discount' => false,
        ];
    }
}
