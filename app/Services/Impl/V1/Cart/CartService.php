<?php

namespace App\Services\Impl\V1\Cart;

use App\Services\Interfaces\Cart\CartServiceInterface;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Impl\V1\Promotion\PromotionPricingService;
use Exception;

class CartService implements CartServiceInterface
{
    protected string $sessionKey = 'cart_v1';
    protected PromotionPricingService $promotionPricingService;
    protected ProductServiceInterface $productService;

    public function __construct(
        PromotionPricingService $promotionPricingService,
        ProductServiceInterface $productService
    )
    {
        $this->promotionPricingService = $promotionPricingService;
        $this->productService = $productService;
    }

    public function add(int $productId, ?int $variantId = null, int $quantity = 1): array
    {
        $cart = $this->get();
        // Remove voucher when modifying cart to ensure validity
        if (isset($cart['voucher_code'])) {
            unset($cart['voucher_code']);
            unset($cart['discount_total']);
            unset($cart['voucher_info']);
        }
        
        // ... (existing add logic) ...
        // Use ProductService show method (adhering to Service-Repo pattern)
        // This leverages BaseService/BaseCacheService logic and $with relations (including variants)
        $product = $this->productService->show($productId);
        $variant = null;

        if ($variantId) {
            $variant = $product->variants->where('id', $variantId)->first();
            if (!$variant) {
                throw new Exception('Biến thể sản phẩm không tồn tại');
            }
        }

        // --- Kiểm tra tồn kho (Inventory Check) ---
        $trackInventory = (bool)($product->track_inventory ?? true);
        $allowNegative = (bool)($product->allow_negative_stock ?? false);
        
        if ($trackInventory && !$allowNegative) {
            $entity = $variant ?: $product;
            $currentStock = 0;
            
            // Lấy stock quantity từ Resource logic (giả định Service đã load đủ relation)
            if ($product->management_type === 'batch') {
                $batches = $variant ? $variant->batches : $product->batches;
                foreach ($batches as $batch) {
                    $currentStock += $batch->warehouseStocks->sum('stock_quantity');
                }
            } else {
                $stocks = $variant ? $variant->warehouseStocks : $product->warehouseStocks;
                $currentStock = $stocks->sum('stock_quantity');
            }

            $currentInCart = isset($cart['items'][$productId . ($variantId ? '_' . $variantId : '')]) 
                ? $cart['items'][$productId . ($variantId ? '_' . $variantId : '')]['quantity'] 
                : 0;

            if (($currentInCart + $quantity) > $currentStock) {
                throw new Exception('Số lượng vượt quá tồn kho cho phép (Hiện còn: ' . $currentStock . ')');
            }
        }

        // Logic key để gộp dòng
        $rowId = $productId . ($variantId ? '_' . $variantId : '');

        // Tính giá
        // Sử dụng PromotionPricingService để lấy giá chính xác
        $entity = $variant ?: $product;
        $priceResult = $this->promotionPricingService->calculateFinalPrice($entity, $quantity);
        
        $price = $priceResult['final_price'];
        $originalPrice = $priceResult['original_price'];

        if (isset($cart['items'][$rowId])) {
            $cart['items'][$rowId]['quantity'] += $quantity;
        } else {
            // Get translated name from pivot or fallback
            $translatedName = $product->current_languages->first()?->pivot?->name ?? $product->name;
            $cartName = $translatedName ?: 'Sản phẩm không tên';
            
            // Use image or fallback to first item in album
            $cartImage = $product->image ?: ($product->album[0] ?? null);
            $options = [];

            if ($variant) {
                $variantName = $variant->name ?: '';
                if (!empty($variantName)) {
                    $cartName .= ' - ' . $variantName;
                }
                $cartImage = $variant->image ?: $cartImage;

                // Extract attributes for options (Size, Color, etc.)
                if ($variant->relationLoaded('attributes')) {
                    foreach ($variant->attributes as $attribute) {
                        try {
                            $catName = null;
                            if ($attribute->relationLoaded('attribute_catalogue')) {
                                $cat = $attribute->attribute_catalogue;
                                // Try to get translated name
                                $catName = $cat->current_languages->first()?->pivot?->name ?? $cat->name; 
                            }
                            // Fallback if no catalogue name
                            $key = $catName ?: 'Option';

                            // Attribute value name
                            $valName = $attribute->current_languages->first()?->pivot?->name ?? $attribute->name; 
                            $options[$key] = $valName;
                        } catch (\Exception $e) {
                        }
                    }
                }
            }

            $cart['items'][$rowId] = [
                'row_id' => $rowId,
                'product_id' => $productId,
                'variant_id' => $variantId,
                'name' => $cartName,
                'image' => $cartImage,
                'price' => $price,
                'original_price' => $originalPrice,
                'quantity' => $quantity,
                'options' => $options, 
                'promotion_info' => $priceResult 
            ];
        }

        $this->save($cart);

        return $this->get();
    }

    public function update(string $rowId, int $quantity): array
    {
        $cart = $this->get();
        // Remove voucher on update
        if (isset($cart['voucher_code'])) {
            unset($cart['voucher_code']);
            unset($cart['discount_total']);
            unset($cart['voucher_info']);
        }

        if (isset($cart['items'][$rowId])) {
            if ($quantity <= 0) {
                unset($cart['items'][$rowId]);
            } else {
                $cart['items'][$rowId]['quantity'] = $quantity;

                // Recalculate price for the new quantity (Wholesale/Tiered Pricing support)
                try {
                    $item = $cart['items'][$rowId];
                    // Fetch fresh product/variant entity
                    $product = $this->productService->show((int)$item['product_id']);
                    $variant = null;
                    if (!empty($item['variant_id'])) {
                        $variant = $product->variants->where('id', $item['variant_id'])->first();
                    }
                    
                    $entity = $variant ?: $product;
                    if ($entity) {
                        $priceResult = $this->promotionPricingService->calculateFinalPrice($entity, $quantity);
                        $cart['items'][$rowId]['price'] = $priceResult['final_price'];
                        $cart['items'][$rowId]['promotion_info'] = $priceResult;
                    }
                } catch (\Exception $e) {
                    // Fallback: keep existing price
                    \Illuminate\Support\Facades\Log::error('Failed to recalculate price on cart update: ' . $e->getMessage());
                }
            }
            $this->save($cart);
        }

        return $this->get();
    }

    public function remove(string $rowId): array
    {
        $cart = $this->get();
        // Remove voucher on remove
        if (isset($cart['voucher_code'])) {
            unset($cart['voucher_code']);
            unset($cart['discount_total']);
            unset($cart['voucher_info']);
        }

        if (isset($cart['items'][$rowId])) {
            unset($cart['items'][$rowId]);
            $this->save($cart);
        }

        return $this->get();
    }

    public function get(): array
    {
        $cart = Session::get($this->sessionKey, [
            'items' => [],
            'total_quantity' => 0,
            'total_price' => 0
        ]);

        // Recalculate cart to ensure promotions are always fresh
        if (!empty($cart['items'])) {
            $this->save($cart);
            $cart = Session::get($this->sessionKey);
        }

        // Self-Healing Logic
        $hasUpdates = false;
        foreach ($cart['items'] as &$item) {
            $needsUpdate = empty($item['name']) || $item['name'] === 'Sản phẩm không tên' || 
                           ($item['name'] === ' - ') ||
                           (!empty($item['variant_id']) && empty($item['options']));

            if ($needsUpdate) {
                try {
                    $product = $this->productService->show((int)$item['product_id']);
                    if ($product) {
                        $translatedName = $product->current_languages->first()?->pivot?->name ?? $product->name;
                        $cartName = $translatedName ?: 'Sản phẩm không tên';
                        $cartImage = $product->image ?: ($product->album[0] ?? null);

                        if (!empty($item['variant_id'])) {
                            $variant = $product->variants->where('id', $item['variant_id'])->first();
                            if ($variant) {
                                if ($variant->name) $cartName .= ' - ' . $variant->name;
                                $item['options'] = $variant->name;
                            }
                        }

                        $item['name'] = $cartName;
                        if (empty($item['image'])) $item['image'] = $cartImage;
                        $hasUpdates = true;
                    }
                } catch (\Exception $e) {}
            }
        }
        unset($item);
        
        if ($hasUpdates) {
            Session::put($this->sessionKey, $cart);
        }

        return $cart;
    }

    public function applyVoucher(string $code): array
    {
        $cart = $this->get();
        $voucherService = app(\App\Services\Impl\V1\Voucher\VoucherService::class);
        $voucher = $voucherService->validateVoucher($code, $cart['items'], $cart['total_price']);
        
        $cart['voucher_code'] = $code;
        $cart['voucher_info'] = [
            'id' => $voucher->id,
            'code' => $voucher->code,
            'type' => $voucher->type,
            'discount_value' => $voucher->discount_value,
            'discount_type' => $voucher->discount_type,
            'max_discount_value' => $voucher->max_discount_value,
        ];
        
        $this->save($cart);
        return $this->get();
    }

    public function count(): int
    {
        $cart = Session::get($this->sessionKey, ['total_quantity' => 0]);
        return $cart['total_quantity'];
    }

    public function clear(): void
    {
        Session::forget($this->sessionKey);
    }
    
    protected function save(array $cart): void
    {
        // 1. Dọn dẹp các món quà tặng cũ (is_gift = true) để tính toán lại từ đầu
        $realItems = array_filter($cart['items'], fn($item) => empty($item['is_gift']));
        $cart['items'] = $realItems;

        $totalQuantity = 0;
        $totalRetailPrice = 0;
        $totalProductDiscount = 0;
        $subtotalAfterProductDiscount = 0;

        $productIds = array_unique(array_column($cart['items'], 'product_id'));
        $variantIds = array_unique(array_filter(array_column($cart['items'], 'variant_id')));
        
        $products = \App\Models\Product::whereIn('id', $productIds)->with('product_catalogues')->get()->keyBy('id');
        $variants = !empty($variantIds) ? \App\Models\ProductVariant::whereIn('id', $variantIds)->get()->keyBy('id') : collect();

        foreach ($cart['items'] as &$item) {
            $entity = !empty($item['variant_id']) ? ($variants[$item['variant_id']] ?? null) : ($products[$item['product_id']] ?? null);
            
            if (!$entity) continue;

            $pricing = $this->promotionPricingService->calculateFinalPrice($entity, $item['quantity']);

            $item['prices'] = [
                'retail' => (float)$pricing['original_price'],
                'promo' => (float)$pricing['final_price'], // Giá sau khi giảm giá sản phẩm trực tiếp
                'final_unit' => (float)$pricing['final_price']
            ];
            $item['product_promotions'] = $pricing['applied_promotions'] ?? [];
            $item['price'] = (float)$pricing['final_price'];
            
            // Đính kèm catalogue_ids để phục vụ matching BXGY sau này
            $product = !empty($item['variant_id']) ? $entity->product : $entity;
            $item['catalogue_ids'] = $product->product_catalogues->pluck('id')->toArray();

            $totalQuantity += $item['quantity'];
            $totalRetailPrice += ($pricing['original_price'] * $item['quantity']);
            $totalProductDiscount += ($pricing['discount_amount'] * $item['quantity']);
            $subtotalAfterProductDiscount += ($pricing['final_price'] * $item['quantity']);
        }
        unset($item);

        // 3. Xử lý Buy X Get Y Promotions
        $buyXGetYPromotions = \App\Models\Promotion::where('publish', 2)
            ->where('type', 'buy_x_get_y')
            ->expiryStatus('active')
            ->with(['buy_x_get_y_items'])
            ->get();

        $buyXGetYDiscounts = 0;
        $appliedBuyXGetY = [];
        $eligibleRewards = []; 

        // Helper check match
        $matchRule = function ($item, $rule) {
            if ($rule->apply_type === 'product' && $item['product_id'] == $rule->product_id) return true;
            if ($rule->apply_type === 'product_variant' && !empty($item['variant_id']) && $item['variant_id'] == $rule->product_variant_id) return true;
            if ($rule->apply_type === 'product_catalogue' && in_array((int)$rule->product_catalogue_id, array_map('intval', $item['catalogue_ids'] ?? []))) return true;
            return false;
        };

        foreach ($buyXGetYPromotions as $promo) {
            $buyRules = $promo->buy_x_get_y_items->where('item_type', 'buy');
            $getRules = $promo->buy_x_get_y_items->where('item_type', 'get');
            if ($buyRules->isEmpty() || $getRules->isEmpty()) continue;

            // 3.1. Tính tổng số lượng X (Sản phẩm Mua)
            $totalBuyQty = 0;
            foreach ($cart['items'] as $item) {
                foreach ($buyRules as $rule) {
                    if ($matchRule($item, $rule)) {
                        if ($rule->min_order_value > 0 && ($item['prices']['retail'] * $item['quantity']) < $rule->min_order_value) continue;
                        $totalBuyQty += $item['quantity'];
                    }
                }
            }
            if ($totalBuyQty <= 0) continue;

            // 3.2. Tính số lượng Y được hưởng (Phần thưởng)
            $ruleBuyQty = $buyRules->first()->quantity ?: 1;
            $ruleGetQty = $getRules->first()->quantity ?: 1;
            $numRewards = floor($totalBuyQty / $ruleBuyQty) * $ruleGetQty;
            if ($numRewards <= 0) continue;

            // 3.3. Áp dụng phần thưởng (Gifts hoặc Discounts)
            foreach ($getRules as $getRule) {
                if ($numRewards <= 0) break;

                // TH1: MIỄN PHÍ (Quà tặng tự động)
                if ($promo->discount_type === 'free') {
                    // Fetch product info cho quà tặng nếu cần
                    $giftProduct = $this->productService->show((int)$getRule->product_id);
                    $giftVariant = !empty($getRule->product_variant_id) ? $giftProduct->variants->where('id', $getRule->product_variant_id)->first() : null;
                    $entity = $giftVariant ?: $giftProduct;
                    
                    $name = $giftProduct->languages->where('language_id', config('app.language_id'))->first()?->pivot?->name ?? $giftProduct->name;
                    if ($giftVariant) $name .= ' - ' . ($giftVariant->name ?: 'Biến thể');

                    // Tạo một row_id đặc thù cho quà tặng của Promo này
                    $giftRowId = 'gift_' . $promo->id . '_' . $getRule->id;
                    
                    $cart['items'][$giftRowId] = [
                        'row_id' => $giftRowId,
                        'product_id' => $getRule->product_id,
                        'variant_id' => $getRule->product_variant_id,
                        'name' => $name,
                        'image' => $entity->image ?? $giftProduct->image ?? '',
                        'price' => 0, // Miễn phí
                        'original_price' => (float)($entity->retail_price ?? 0),
                        'quantity' => $numRewards,
                        'is_gift' => true,
                        'promo_id' => $promo->id,
                        'promo_name' => $promo->name,
                        'options' => [], // Có thể bổ sung nếu cần
                        'product_promotions' => [[
                            'id' => $promo->id,
                            'name' => $promo->name,
                            'type' => 'buy_x_get_y',
                            'discount' => (float)($entity->retail_price ?? 0) * $numRewards,
                            'apply_qty' => $numRewards
                        ]]
                    ];
                    
                    $buyXGetYDiscounts += ($cart['items'][$giftRowId]['original_price'] * $numRewards);
                    $numRewards = 0; // Hết quota thưởng cho rule này
                } 
                // TH2: GIẢM GIÁ (Người dùng phải chọn)
                else {
                    $foundInCart = false;
                    foreach ($cart['items'] as $rowId => &$item) {
                        if ($matchRule($item, $getRule)) {
                            $foundInCart = true;
                            $applyQty = min($item['quantity'], $numRewards);
                            
                            $canCombine = (bool)$promo->combine_with_product_discount;
                            $basePrice = $canCombine ? $item['prices']['promo'] : $item['prices']['retail'];
                            
                            $discountPerUnit = 0;
                            if ($promo->discount_type === 'percentage') $discountPerUnit = $basePrice * ($promo->discount_value / 100);
                            elseif ($promo->discount_type === 'fixed_amount') $discountPerUnit = min($promo->discount_value, $basePrice);

                            if (!$canCombine) {
                                $alreadyDiscounted = $item['prices']['retail'] - $item['prices']['promo'];
                                $discountPerUnit = max(0, $discountPerUnit - $alreadyDiscounted);
                            }

                            $itemDiscount = $discountPerUnit * $applyQty;
                            if ($itemDiscount > 0) {
                                $item['price'] -= ($itemDiscount / $item['quantity']);
                                $item['product_promotions'][] = [
                                    'id' => $promo->id, 'name' => $promo->name, 'type' => 'buy_x_get_y',
                                    'discount' => $itemDiscount, 'apply_qty' => $applyQty
                                ];
                                $buyXGetYDiscounts += $itemDiscount;
                            }
                            $numRewards -= $applyQty;
                        }
                    }
                    unset($item);

                    // Nếu chưa có trong giỏ, đưa vào gợi ý
                    if ($numRewards > 0) {
                        $rewardProduct = $this->productService->show((int)$getRule->product_id);
                        $eligibleRewards[] = [
                            'promo_id' => $promo->id, 'promo_name' => $promo->name,
                            'product' => $rewardProduct, 'variant_id' => $getRule->product_variant_id,
                            'discount_type' => $promo->discount_type, 'discount_value' => $promo->discount_value,
                            'max_reward_qty' => $numRewards
                        ];
                    }
                }
            }
        }

        // 4. Tính toán lại tổng cộng sau BXGY
        $totalQuantity = 0;
        $totalRetailPrice = 0;
        $totalProductDiscount = 0;
        $subtotalAfterBXGY = 0;

        foreach ($cart['items'] as $item) {
            $totalQuantity += $item['quantity'];
            if (!empty($item['is_gift'])) {
                $totalRetailPrice += ($item['original_price'] * $item['quantity']);
            } else {
                $totalRetailPrice += ($item['prices']['retail'] * $item['quantity']);
                $totalProductDiscount += ($item['prices']['retail'] - $item['prices']['promo']) * $item['quantity'];
            }
            $subtotalAfterBXGY += ($item['price'] * $item['quantity']);
        }

        $cart['eligible_rewards'] = $eligibleRewards;
        $subtotalAfterBuyXGetY = $subtotalAfterBXGY;

        // 5. Order Promotions (giảm giá trên tổng đơn)
        $orderPromotions = $this->promotionPricingService->getActiveOrderPromotions();
        $combinableList = $orderPromotions->filter(fn($p) => $p->combine_with_product_discount);
        
        $stackableDiscount = 0;
        $stackablePromos = [];
        $standaloneBestDiscount = 0;
        $standaloneBestPromo = null;

        foreach ($combinableList as $promo) {
            $discount = $this->promotionPricingService->calculateOrderPromotionDiscount($subtotalAfterBuyXGetY, $promo);
            if ($discount <= 0) continue;

            if ($promo->combine_with_order_discount) {
                $stackableDiscount += $discount;
                $stackablePromos[] = ['id' => $promo->id, 'name' => $promo->name, 'amount' => $discount];
            } else {
                if ($discount > $standaloneBestDiscount) {
                    $standaloneBestDiscount = $discount;
                    $standaloneBestPromo = ['id' => $promo->id, 'name' => $promo->name, 'amount' => $discount];
                }
            }
        }
        
        $combinableOrderDiscount = 0;
        $combinableOrderPromos = [];

        if ($stackableDiscount >= $standaloneBestDiscount && $stackableDiscount > 0) {
            $combinableOrderDiscount = $stackableDiscount;
            $combinableOrderPromos = $stackablePromos;
        } else {
            $combinableOrderDiscount = $standaloneBestDiscount;
            $combinableOrderPromos = $standaloneBestPromo ? [$standaloneBestPromo] : [];
        }
        
        $totalBenefit1 = $totalProductDiscount + $combinableOrderDiscount + $buyXGetYDiscounts;

        $bestSingleOrderDiscount = 0;
        $bestSingleOrderPromo = null;
        foreach ($orderPromotions as $promo) {
            $discount = $this->promotionPricingService->calculateOrderPromotionDiscount($totalRetailPrice, $promo);
            if ($discount > $bestSingleOrderDiscount) {
                $bestSingleOrderDiscount = $discount;
                $bestSingleOrderPromo = ['id' => $promo->id, 'name' => $promo->name, 'amount' => $discount];
            }
        }
        
        $voucherDiscount = 0;
        if (isset($cart['voucher_info'])) {
            $voucherService = app(\App\Services\Impl\V1\Voucher\VoucherService::class);
            $voucherDiscount = $voucherService->calculateVoucherDiscount(
                $cart['voucher_info'],
                $cart['items'],
                $subtotalAfterBuyXGetY - $combinableOrderDiscount // Apply voucher after product and order promos
            );
        }

        $finalTotal = $subtotalAfterBuyXGetY;

        if ($totalBenefit1 >= $bestSingleOrderDiscount) {
            // Use combinable discounts
            $finalTotal -= $combinableOrderDiscount;
        } else {
            // Use best single order discount, reset product/BXGY discounts
            $combinableOrderDiscount = $bestSingleOrderDiscount;
            $combinableOrderPromos = [$bestSingleOrderPromo];
            foreach ($cart['items'] as &$item) {
                $item['price'] = $item['prices']['retail'];
                $item['prices']['final_unit'] = $item['prices']['retail'];
                $item['product_promotions'] = [];
            }
            unset($item);
            $totalProductDiscount = 0;
            $buyXGetYDiscounts = 0;
            $appliedBuyXGetY = [];
            $subtotalAfterBuyXGetY = $totalRetailPrice; // Recalculate subtotal if product/BXGY discounts are reset
            $finalTotal = $subtotalAfterBuyXGetY - $combinableOrderDiscount;
        }

        $finalTotal -= $voucherDiscount;

        $cart['summary'] = [
            'total_quantity' => $totalQuantity,
            'total_retail' => $totalRetailPrice,
            'total_product_discount' => $totalProductDiscount,
            'buy_x_get_y_discount' => [
                'total' => $buyXGetYDiscounts,
                'applied_promos' => $appliedBuyXGetY
            ],
            'subtotal' => $subtotalAfterBuyXGetY,
            'order_discount' => [
                'total' => $combinableOrderDiscount,
                'applied_promos' => $combinableOrderPromos
            ],
            'voucher_discount' => $voucherDiscount,
            'final_total' => $finalTotal
        ];

        // Sync back flat properties
        $cart['total_quantity'] = $totalQuantity;
        $cart['total_price'] = $subtotalAfterBXGY; 
        $cart['discount_total'] = $totalProductDiscount + $buyXGetYDiscounts + $combinableOrderDiscount + $voucherDiscount;
        $cart['final_total'] = $finalTotal;

        Session::put($this->sessionKey, $cart);
    }
}
