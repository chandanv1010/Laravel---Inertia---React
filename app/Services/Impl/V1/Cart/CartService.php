<?php

namespace App\Services\Impl\V1\Cart;

use App\Services\Interfaces\Cart\CartServiceInterface;
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
        $totalQuantity = 0;
        $totalRetailPrice = 0;
        $totalProductDiscount = 0;
        $subtotalAfterProductDiscount = 0;

        foreach ($cart['items'] as &$item) {
            $pricing = $this->promotionPricingService->calculateFinalPrice(
                !empty($item['variant_id']) 
                    ? \App\Models\ProductVariant::find($item['variant_id']) 
                    : \App\Models\Product::find($item['product_id']),
                $item['quantity']
            );

            $item['prices'] = [
                'retail' => (float)$pricing['original_price'],
                'promo' => (float)$pricing['final_price'],
                'final_unit' => (float)$pricing['final_price']
            ];
            $item['product_promotions'] = $pricing['applied_promotions'] ?? [];
            $item['price'] = (float)$pricing['final_price'];
            
            $totalQuantity += $item['quantity'];
            $totalRetailPrice += ($pricing['original_price'] * $item['quantity']);
            $totalProductDiscount += ($pricing['discount_amount'] * $item['quantity']);
            $subtotalAfterProductDiscount += ($pricing['final_price'] * $item['quantity']);
        }

        $orderPromotions = $this->promotionPricingService->getActiveOrderPromotions();
        $combinableList = $orderPromotions->filter(fn($p) => $p->combine_with_product_discount);
        
        $stackableDiscount = 0;
        $stackablePromos = [];
        $standaloneBestDiscount = 0;
        $standaloneBestPromo = null;

        foreach ($combinableList as $promo) {
            $discount = $this->promotionPricingService->calculateOrderPromotionDiscount($subtotalAfterProductDiscount, $promo);
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
        
        if ($stackableDiscount >= $standaloneBestDiscount && $stackableDiscount > 0) {
            $combinableOrderDiscount = $stackableDiscount;
            $combinableOrderPromos = $stackablePromos;
        } else {
            $combinableOrderDiscount = $standaloneBestDiscount;
            $combinableOrderPromos = $standaloneBestPromo ? [$standaloneBestPromo] : [];
        }
        
        $totalBenefit1 = $totalProductDiscount + $combinableOrderDiscount;

        $bestSingleOrderDiscount = 0;
        $bestSingleOrderPromo = null;
        foreach ($orderPromotions as $promo) {
            $discount = $this->promotionPricingService->calculateOrderPromotionDiscount($totalRetailPrice, $promo);
            if ($discount > $bestSingleOrderDiscount) {
                $bestSingleOrderDiscount = $discount;
                $bestSingleOrderPromo = ['id' => $promo->id, 'name' => $promo->name, 'amount' => $discount];
            }
        }
        
        $appliedOrderPromos = [];
        $orderDiscountTotal = 0;

        if ($totalBenefit1 >= $bestSingleOrderDiscount) {
            $orderDiscountTotal = $combinableOrderDiscount;
            $appliedOrderPromos = $combinableOrderPromos;
        } else {
            $orderDiscountTotal = $bestSingleOrderDiscount;
            $appliedOrderPromos = [$bestSingleOrderPromo];
            foreach ($cart['items'] as &$item) {
                $item['price'] = $item['prices']['retail'];
                $item['prices']['final_unit'] = $item['prices']['retail'];
                $item['product_promotions'] = [];
            }
            $totalProductDiscount = 0;
            $subtotalAfterProductDiscount = $totalRetailPrice;
        }

        $cart['summary'] = [
            'total_quantity' => $totalQuantity,
            'total_retail' => $totalRetailPrice,
            'total_product_discount' => $totalProductDiscount,
            'subtotal' => $subtotalAfterProductDiscount,
            'order_discount' => ['total' => $orderDiscountTotal, 'applied_promos' => $appliedOrderPromos],
            'voucher_discount' => 0,
            'final_total' => max(0, $subtotalAfterProductDiscount - $orderDiscountTotal)
        ];

        $cart['total_quantity'] = $totalQuantity;
        $cart['total_price'] = $subtotalAfterProductDiscount;
        $cart['discount_total'] = $orderDiscountTotal;
        $cart['final_total'] = $cart['summary']['final_total'];

        Session::put($this->sessionKey, $cart);
    }
}
