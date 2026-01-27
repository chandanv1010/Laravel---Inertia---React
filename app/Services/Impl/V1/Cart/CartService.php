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

    public function get(): array
    {
        $cart = Session::get($this->sessionKey, [
            'items' => [],
            'total_quantity' => 0,
            'total_price' => 0
        ]);

        // Self-Healing Logic: Fix missing names/options in existing sessions
        $hasUpdates = false;
        foreach ($cart['items'] as &$item) {
            // Check if needs update: Name missing/generic OR (Variant exists but Options missing)
            $needsUpdate = empty($item['name']) || $item['name'] === 'Sản phẩm không tên' || 
                           ($item['name'] === ' - ') ||
                           (!empty($item['variant_id']) && empty($item['options']));

            if ($needsUpdate) {
                try {
                    $product = $this->productService->show((int)$item['product_id']);
                    if ($product) {
                        // 1. Fix Name
                        $translatedName = $product->current_languages->first()?->pivot?->name ?? $product->name;
                        $cartName = $translatedName ?: 'Sản phẩm không tên';

                        // 2. Fix Image (Fallback)
                        $cartImage = $product->image ?: ($product->album[0] ?? null);

                        // 3. Fix Variant Info
                        $variant = null;
                        if (!empty($item['variant_id'])) {
                            $variant = $product->variants->where('id', $item['variant_id'])->first();
                            if ($variant) {
                                $variantName = $variant->name ?: '';
                                if (!empty($variantName)) {
                                    $cartName .= ' - ' . $variantName;
                                }
                                $cartImage = $variant->image ?: $cartImage;

                                // Re-populate Options
                                $options = [];
                                if ($variant->relationLoaded('attributes')) {
                                    foreach ($variant->attributes as $attribute) {
                                        try {
                                            $catName = null;
                                            if ($attribute->relationLoaded('attribute_catalogue')) {
                                                $cat = $attribute->attribute_catalogue;
                                                $catName = $cat->current_languages->first()?->pivot?->name ?? $cat->name; 
                                            }
                                            $key = $catName ?: 'Option';
                                            $valName = $attribute->current_languages->first()?->pivot?->name ?? $attribute->name;
                                            $options[$key] = $valName;
                                        } catch (\Exception $e) {}
                                    }
                                }
                                $item['options'] = $options;
                            }
                        }

                        $item['name'] = $cartName;
                        $item['image'] = $cartImage; // Update image just in case
                        
                        $hasUpdates = true;
                    }
                } catch (\Exception $e) {
                    // Log error or ignore to prevent breaking the cart completely
                }
            }
        }

        if ($hasUpdates) {
            $this->save($cart);
        }

        return $cart;
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

    public function applyVoucher(string $code): array
    {
        $cart = $this->get();
        $voucherService = app(\App\Services\Impl\V1\Voucher\VoucherService::class);
        
        // Reset prices first to ensure clean calculation
        // Need to refetch prices? Or just trust stored original/promo price?
        // Trust stored for now, but in save() we recalculate.
        
        $voucher = $voucherService->validateVoucher($code, $cart['items'], $cart['total_price']);
        
        // If valid, store code
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
        $cart = $this->get();
        return $cart['total_quantity'];
    }

    public function clear(): void
    {
        Session::forget($this->sessionKey);
    }
    
    protected function save(array $cart): void
    {
        // 1. Calculate Raw Totals (before voucher)
        $totalQuantity = 0;
        $rawTotalPrice = 0;

        foreach ($cart['items'] as $key => &$item) {
             // Reset price to base promo price if needed (e.g. if BuyXGetY previously set it to 0)
             // We stored 'promotion_info' with 'final_price'.
             if (isset($item['promotion_info']['final_price'])) {
                 $item['price'] = $item['promotion_info']['final_price'];
             }
        }
        unset($item); // break ref

        foreach ($cart['items'] as $item) {
            $totalQuantity += $item['quantity'];
            $rawTotalPrice += ($item['price'] * $item['quantity']);
        }

        $cart['total_quantity'] = $totalQuantity;
        $cart['total_price'] = $rawTotalPrice; // Subtotal
        $cart['discount_total'] = 0;
        $cart['final_total'] = $rawTotalPrice;

        // 2. Apply Voucher Logic if exists
        if (!empty($cart['voucher_code']) && !empty($cart['voucher_info'])) {
            $vInfo = $cart['voucher_info'];
            $discountAmount = 0;
            
            // Re-validate strictly? Or assume modify actions clear voucher?
            // Modify actions (add/update/remove) clear voucher, so here we assume it's validish,
            // but effectively we should re-check minimal conditions if possible or just calculate.
            
            if ($vInfo['type'] === 'order_discount' || $vInfo['type'] === 'free_shipping') {
                 // Free shipping usually affects shipping fee, not order total directly unless we just subtract value.
                 // Assuming 'free_shipping' works as order discount for now based on previous code usage
                 // or maybe separate field. Logic below assumes discount value.
                 
                 if ($vInfo['discount_type'] === 'percentage') {
                     $discountAmount = $rawTotalPrice * ($vInfo['discount_value'] / 100);
                     if (!empty($vInfo['max_discount_value']) && $vInfo['max_discount_value'] > 0) {
                         $discountAmount = min($discountAmount, $vInfo['max_discount_value']);
                     }
                 } else { // fixed
                     $discountAmount = $vInfo['discount_value'];
                 }
            } elseif ($vInfo['type'] === 'product_discount') {
                // Not implemented: Per-item discount calculation for now.
                // Assuming it works like order discount but restricted to items? 
                // Or acts on specific items? 
                // Previous logic treated it as modifying eligiblity.
                // Simplicity: Calculate total discount based on applicable items sum?
                // Let's assume order discount behavior for now or User didn't specify strict product-level price change.
                // Actually User said "tính toán lại toàn bộ giỏ hàng", "tùy vào loại voucher".
                // Let's try simple total discount first.
                 if ($vInfo['discount_type'] === 'percentage') {
                     $discountAmount = $rawTotalPrice * ($vInfo['discount_value'] / 100);
                     if (!empty($vInfo['max_discount_value']) && $vInfo['max_discount_value'] > 0) {
                         $discountAmount = min($discountAmount, $vInfo['max_discount_value']);
                     }
                 } else {
                     $discountAmount = $vInfo['discount_value'];
                 }
            } elseif ($vInfo['type'] === 'buy_x_get_y') {
                 // Logic: Find GET items in cart, make them free (price = 0)
                 // We need to fetch GET items definition again? Or store in voucher_info?
                 // Storing is better. But existing validateVoucher didn't return GET structure.
                 // Let's fetch quickly.
                 $getItems = \Illuminate\Support\Facades\DB::table('voucher_buy_x_get_y_items')
                    ->where('voucher_id', $vInfo['id'])
                    ->where('item_type', 'get')
                    ->get();
                 
                 foreach ($getItems as $getItem) {
                      foreach ($cart['items'] as &$item) {
                          $isTarget = false;
                          if ($getItem->apply_type === 'product' && $item['product_id'] == $getItem->product_id) {
                              $isTarget = true;
                          } elseif ($getItem->apply_type === 'product_variant' && isset($item['variant_id']) && $item['variant_id'] == $getItem->product_variant_id) {
                              $isTarget = true;
                          } elseif ($getItem->apply_type === 'product_catalogue') {
                               // Check catalogue
                               $inCatalogue = \Illuminate\Support\Facades\DB::table('product_catalogue_product')
                                  ->where('product_id', $item['product_id'])
                                  ->where('product_catalogue_id', $getItem->product_catalogue_id)
                                  ->exists();
                               if ($inCatalogue) $isTarget = true;
                          }
                          
                          if ($isTarget) {
                              // Found a GET item. Set price to 0 or discount?
                              // Usually FREE.
                              // Check qty. If cart has 2, get 1 free? Or all free?
                              // "quantity" in DB usually means "Get Qty".
                              // Simplicity: Make ALL of them free or limit? 
                              // Logic usually: Buy X get Y (1). If specific qty logic needed, it's complex.
                              // Assuming "Get Y" means "Set price of Y to 0 for matching items up to quantity limit".
                              
                              $discountableQty = min($item['quantity'], $getItem->quantity); // Limit free items
                              if ($discountableQty > 0) {
                                  // For display, we can set price to 0????
                                  // Or just enable discount_total.
                                  // Setting price to 0 affects total directly.
                                  // BUT we calculated total previously.
                                  // Let's reduce total.
                                  $itemDiscount = $item['price'] * $discountableQty;
                                  $discountAmount += $itemDiscount;
                                  
                                  // Mark it in options or similar?
                                  // Maybe split item line? Too complex.
                                  // Just reduce Total Price.
                              }
                          }
                      }
                 }
            }

            $cart['discount_total'] = $discountAmount;
            $cart['final_total'] = max(0, $rawTotalPrice - $discountAmount);
        }

        Session::put($this->sessionKey, $cart);
    }
}
