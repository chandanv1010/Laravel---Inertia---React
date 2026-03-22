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
    ) {
        $this->promotionPricingService = $promotionPricingService;
        $this->productService = $productService;
    }

    public function get(): array
    {
        return Session::get($this->sessionKey, [
            'items' => [],
            'subtotal' => 0,
            'total_quantity' => 0,
            'total_price' => 0,
            'eligible_rewards' => []
        ]);
    }

    public function count(): int
    {
        $cart = $this->get();
        return (int)($cart['total_quantity'] ?? 0);
    }

    public function clear(): void
    {
        Session::forget($this->sessionKey);
    }

    public function recalculate(): void
    {
        $cart = $this->get();
        if (!empty($cart['items'])) {
            $this->save($cart);
        }
    }

    protected bool $isSaving = false;

    public function add(int $productId, ?int $variantId = null, int $quantity = 1, ?int $promoId = null): array
    {
        $this->internalAdd($productId, $variantId, $quantity, $promoId, false);
        $cart = $this->get();
        $this->save($cart);
        return $this->get();
    }

    protected function internalAdd(int $productId, ?int $variantId = null, int $quantity = 1, ?int $promoId = null, bool $isGift = false): void
    {
        $cart = $this->get();
        $this->performAdd($cart, $productId, $variantId, $quantity, $promoId, $isGift);
        Session::put($this->sessionKey, $cart);
    }

    protected function performAdd(array &$cart, int $productId, ?int $variantId = null, int $quantity = 1, ?int $promoId = null, bool $isGift = false): void
    {
        $product = $this->productService->show($productId);
        $variant = $variantId ? $product->variants->where('id', $variantId)->first() : null;
        if ($variantId && !$variant) throw new Exception('Biến thể không tồn tại');

        $rowId = $this->generateRowId($productId, $variantId, $promoId);
        $entity = $variant ?: $product;

        // Inventory check
        $trackInventory = (bool)($product->track_inventory ?? true);
        if ($trackInventory && !($product->allow_negative_stock ?? false)) {
            $currentStock = $this->getStockLevel($product, $variant);
            $currentInCart = $this->countProductInCart($cart, $productId, $variantId);
            if (($currentInCart + $quantity) > $currentStock) {
                throw new Exception('Số lượng vượt quá tồn kho (Còn: ' . $currentStock . ')');
            }
        }

        if (isset($cart['items'][$rowId])) {
            $cart['items'][$rowId]['quantity'] += $quantity;
            $cart['items'][$rowId]['is_gift'] = $isGift;
        } else {
            $priceResult = $this->promotionPricingService->calculateFinalPrice($entity, $quantity);
            $translatedName = $product->current_languages->first()?->pivot?->name ?? $product->name;
            $cartName = $translatedName ?: 'Sản phẩm';
            $cartImage = $variant->image ?? $product->image ?? ($product->album[0] ?? null);
            if ($variant) {
                $vName = $variant->name ?: '';
                if ($vName) $cartName .= ' - ' . $vName;
            }

            $cart['items'][$rowId] = [
                'row_id' => $rowId,
                'product_id' => $productId,
                'variant_id' => $variantId,
                'name' => $cartName,
                'image' => $cartImage,
                'price' => $isGift ? 0 : (float)$priceResult['final_price'],
                'original_price' => (float)$priceResult['original_price'],
                'quantity' => $quantity,
                'promo_id' => $promoId,
                'is_gift' => $isGift,
                'prices' => [
                    'retail' => (float)$priceResult['original_price'],
                    'promo' => (float)$priceResult['final_price']
                ]
            ];
        }
    }

    public function update(string $rowId, int $quantity): array
    {
        $cart = $this->get();
        if (isset($cart['items'][$rowId])) {
            if ($quantity <= 0) {
                unset($cart['items'][$rowId]);
            } else {
                $cart['items'][$rowId]['quantity'] = $quantity;
                // Nếu là quà tặng thì việc manual update có thể bị ghi đè bởi save(), 
                // nhưng với base item thì đây là cách đúng đắn nhất.
            }
            $this->save($cart);
        }
        return $this->get();
    }

    public function remove(string $rowId): array
    {
        $cart = $this->get();
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
        $voucher = $voucherService->validateVoucher($code, $cart['items'], $cart['total_price']);
        $cart['voucher_code'] = $code;
        $cart['voucher_info'] = ['id' => $voucher->id, 'code' => $voucher->code, 'type' => $voucher->type, 'discount_value' => (float)$voucher->discount_value, 'discount_type' => $voucher->discount_type, 'max_discount_value' => (float)$voucher->max_discount_value];
        $this->save($cart);
        return $this->get();
    }
    protected function save(array &$cart): void
    {
        if ($this->isSaving) return;
        $this->isSaving = true;
        try {

        // 1. CLEANUP & CONSOLIDATION
        foreach ($cart['items'] as $rid => $it) {
            if (!empty($it['is_gift']) && !empty($it['promo_id'])) {
                unset($cart['items'][$rid]);
            }
        }

        $consolidated = [];
        foreach ($cart['items'] as $item) {
            if (!empty($item['is_gift']) || !empty($item['promo_id'])) {
                $consolidated[$item['row_id']] = $item;
                continue;
            }
            $key = $item['product_id'] . '_' . ($item['variant_id'] ?? '0');
            if (!isset($consolidated[$key])) {
                $consolidated[$key] = $item;
                $consolidated[$key]['row_id'] = $key;
                $consolidated[$key]['promo_id'] = null;
                $consolidated[$key]['is_gift'] = false;
                unset($consolidated[$key]['bxgy_unit_discount'], $consolidated[$key]['product_promotions']);
            } else {
                $consolidated[$key]['quantity'] += $item['quantity'];
            }
        }
        $cart['items'] = $consolidated;

        // 2. BASE PRICING
        foreach ($cart['items'] as &$item) {
            if (!empty($item['is_gift'])) continue;
            $product = \App\Models\Product::with('product_catalogues')->find($item['product_id']);
            $variant = !empty($item['variant_id']) ? \App\Models\ProductVariant::find($item['variant_id']) : null;
            if (!$product) continue;
            
            $pricing = $this->promotionPricingService->calculateFinalPrice($variant ?: $product, $item['quantity']);
            $item['prices'] = [
                'retail' => (float)$pricing['original_price'],
                'promo' => (float)$pricing['final_price'],
                'is_wholesale_tier' => (bool)($pricing['is_wholesale_tier'] ?? false)
            ];
            $item['price'] = (float)$pricing['final_price'];
            $item['product_promotions'] = $pricing['applied_promotions'] ?? [];
            $item['catalogue_ids'] = $product->product_catalogues->pluck('id')->toArray();
        }
        unset($item); // Fix PHP reference bug

        $totalRetail = 0; $totalProdDisc = 0; $subtotalAfterProd = 0; $totalQty = 0;
        foreach ($cart['items'] as $rid => $item) {
            if (!empty($item['is_gift'])) continue;
            $totalRetail += ($item['prices']['retail'] * $item['quantity']);
            $totalProdDisc += (($item['prices']['retail'] - $item['prices']['promo']) * $item['quantity']);
        }
        unset($item);

        // 3. BXGY
        $promos = \App\Models\Promotion::where('publish', 2)->where('type', 'buy_x_get_y')->expiryStatus('active')->orderBy('id', 'desc')->get();
        $bxgyDisc = 0;
        
        foreach ($promos as $promo) {
            $buyRules = $promo->buy_x_get_y_items->where('item_type', 'buy');
            $getRules = $promo->buy_x_get_y_items->where('item_type', 'get');
            if ($buyRules->isEmpty() || $getRules->isEmpty()) continue;

            $buyNeeded = (int)$buyRules->sum('quantity');
            $overlap = 0;
            foreach ($getRules as $gr) {
                foreach ($buyRules as $br) {
                    if ($gr->product_id == $br->product_id && $gr->product_variant_id == $br->product_variant_id) {
                        $overlap += $gr->quantity;
                    }
                }
            }

            $pool = [];
            foreach ($cart['items'] as $rid => $it) {
                if (!empty($it['is_gift']) || !empty($it['promo_id'])) continue;
                $isB = false; foreach ($buyRules as $r) if ($this->match($it, $r)) { $isB = true; break; }
                $isG = false; foreach ($getRules as $r) if ($this->match($it, $r)) { $isG = true; break; }
                if ($isB || $isG) {
                    $pool[$rid] = ['qty' => $it['quantity'], 'isB' => $isB, 'isG' => $isG, 'price' => $it['prices']['retail'] ?? 0];
                    \Illuminate\Support\Facades\Log::info("  [POOL] Added RID: {$rid}, Qty: {$it['quantity']}, isB: " . ($isB ? 'Y' : 'N'));
                }
            }
            uasort($pool, fn($a, $b) => ($a['price'] ?? 0) <=> ($b['price'] ?? 0));
            $bQty = 0; foreach ($pool as $p) if ($p['isB']) $bQty += $p['qty'];
            
            // --- PROACTIVE INJECTION ---
            if ($promo->discount_type === 'free') {
                $sessionsForInj = ($buyNeeded > 0) ? (int)floor($bQty / $buyNeeded) : 0;
                if ($sessionsForInj > 0) {
                    foreach ($getRules as $gr) {
                        $pid = (int)$gr->product_id;
                        $vid = (int)$gr->product_variant_id;
                        
                        $neededOverall = $sessionsForInj * (int)$gr->quantity;
                        // Count only existing gifts for this product to avoid "stealing" from base items
                        $currentGifts = 0;
                        foreach ($cart['items'] as $it) {
                            if (!empty($it['is_gift']) && (int)$it['product_id'] === $pid && (int)($it['variant_id'] ?? 0) === ($vid ?: 0)) {
                                $currentGifts += $it['quantity'];
                            }
                        }

                        if ($currentGifts < $neededOverall) {
                            $this->internalInjection($cart, $pid, $vid ?: null, $neededOverall - $currentGifts, (int)$promo->id);
                        }
                    }
                }
            }
            // --- END PROACTIVE INJECTION ---

            // Re-calculate pool/sessions after injection
            $pool = [];
            foreach ($cart['items'] as $rid => $it) {
                if (!empty($it['is_gift']) || !empty($it['promo_id'])) continue;
                $isB = false; foreach ($buyRules as $r) if ($this->match($it, $r)) { $isB = true; break; }
                $isG = false; foreach ($getRules as $r) if ($this->match($it, $r)) { $isG = true; break; }
                if ($isB || $isG) $pool[$rid] = ['qty' => $it['quantity'], 'isB' => $isB, 'isG' => $isG, 'price' => $it['prices']['retail']];
            }
            uasort($pool, fn($a, $b) => $a['price'] <=> $b['price']);
            $bQty = 0; foreach ($pool as $p) if ($p['isB']) $bQty += $p['qty'];
            $sessions = ($buyNeeded + $overlap > 0) ? (int)floor($bQty / ($buyNeeded + $overlap)) : 0;
            if ($sessions <= 0) continue;

            foreach ($getRules as $gr) {
                // Subtract existing gifts from this promo to avoid duplication
                $existingGiftQty = 0;
                foreach ($cart['items'] as $it) {
                    if (($it['promo_id'] ?? null) == $promo->id && $this->match($it, $gr)) {
                        $existingGiftQty += $it['quantity'];
                    }
                }
                
                $quota = ($sessions * $gr->quantity) - $existingGiftQty;
                if ($quota <= 0) continue;
                foreach ($pool as $rid => $p) {
                    if ($quota <= 0) break;
                    if (!isset($cart['items'][$rid]) || !$this->match($cart['items'][$rid], $gr)) continue;
                    
                    $it = &$cart['items'][$rid];
                    $take = min($it['quantity'], $quota);
                    $rewId = $this->generateRowId((int)$it['product_id'], (int)($it['variant_id'] ?? 0), (int)$promo->id);
                    
                    if (!isset($cart['items'][$rewId])) {
                        $cart['items'][$rewId] = $it;
                        $cart['items'][$rewId]['row_id'] = $rewId;
                        $cart['items'][$rewId]['quantity'] = $take;
                        $cart['items'][$rewId]['promo_id'] = $promo->id;
                    } else {
                        $cart['items'][$rewId]['quantity'] += $take;
                    }
                    $it['quantity'] -= $take;
                    if ($it['quantity'] <= 0) unset($cart['items'][$rid]);
                    
                    $this->applyBXGY($cart['items'][$rewId], $promo, $cart['items'][$rewId]['quantity']);
                    $bxgyDisc += ($cart['items'][$rewId]['bxgy_unit_discount'] ?? 0) * $take;
                    $quota -= $take;
                    unset($it);
                }
            }
        }

        $subAfterBXGY = 0; foreach ($cart['items'] as $it) $subAfterBXGY += ($it['price'] * $it['quantity']);

        // 4. ORDER PROMOS
        $orderPromos = $this->promotionPricingService->getActiveOrderPromotions();
        $stackDisc = 0;
        foreach ($orderPromos->filter(fn($p) => (bool)$p->combine_with_product_discount) as $p) {
            $stackDisc += $this->promotionPricingService->calculateOrderPromotionDiscount($subAfterBXGY, $p);
        }
        $bestSingle = 0; $bestSinglePromo = null;
        foreach ($orderPromos as $p) {
            $d = $this->promotionPricingService->calculateOrderPromotionDiscount($totalRetail, $p);
            if ($d > $bestSingle) { $bestSingle = $d; $bestSinglePromo = $p; }
        }

        if (($totalProdDisc + $bxgyDisc + $stackDisc) >= $bestSingle) {
            $orderDisc = $stackDisc;
        } else {
            $cart['items'] = $consolidated; 
            foreach ($cart['items'] as &$it) {
                $it['price'] = $it['prices']['retail'];
                $it['product_promotions'] = [];
            }
            $bxgyDisc = 0; $totalProdDisc = 0; $orderDisc = $bestSingle; $subAfterBXGY = $totalRetail;
        }

        // 5. VOUCHER
        $vDist = 0;
        if (!empty($cart['voucher_code'])) {
            try {
                $vs = app(\App\Services\Impl\V1\Voucher\VoucherService::class);
                $v = $vs->validateVoucher($cart['voucher_code'], $cart['items'], $subAfterBXGY - $orderDisc);
                $cart['voucher_info'] = ['id' => $v->id, 'code' => $v->code, 'type' => $v->type, 'discount_value' => (float)$v->discount_value, 'discount_type' => $v->discount_type, 'max_discount_value' => (float)$v->max_discount_value];
                $vDist = $vs->calculateVoucherDiscount($cart['voucher_info'], $cart['items'], $subAfterBXGY - $orderDisc);
            } catch (Exception $e) {
                unset($cart['voucher_code'], $cart['voucher_info']);
            }
        }

        $finalQty = 0; $finalPriceCombined = 0;
        foreach ($cart['items'] as $it) {
            $finalQty += $it['quantity'];
            $finalPriceCombined += ($it['price'] * $it['quantity']);
        }

        $cart['total_quantity'] = $finalQty;
        $cart['total_price'] = $finalPriceCombined;
        $cart['discount_total'] = $totalProdDisc + $bxgyDisc + $orderDisc + $vDist;
        $cart['final_total'] = max(0, $finalPriceCombined - $orderDisc - $vDist);
        $cart['summary'] = [
            'total_retail' => $totalRetail,
            'total_product_discount' => $totalProdDisc,
            'buy_x_get_y_discount' => ['total' => $bxgyDisc, 'applied_promos' => []],
            'subtotal' => $finalPriceCombined,
            'order_discount' => ['total' => $orderDisc, 'applied_promos' => $bestSinglePromo ? [$bestSinglePromo->toArray()] : []],
            'voucher_discount' => $vDist,
            'final_total' => $cart['final_total']
        ];
        Session::put($this->sessionKey, $cart);
        } finally {
            $this->isSaving = false;
        }
    }

    protected function internalInjection(array &$cart, int $pid, ?int $vid, int $qty, ?int $promoId = null): void
    {
        $this->performAdd($cart, $pid, $vid, $qty, $promoId, true);
    }

    protected function match($item, $rule): bool
    {
        $rid = (int)preg_replace('/[^0-9]/', '', (string)$rule->product_id);
        $rvid = (int)preg_replace('/[^0-9]/', '', (string)$rule->product_variant_id);
        $rcatid = (int)preg_replace('/[^0-9]/', '', (string)$rule->product_catalogue_id);

        $match = false;
        if ($rule->apply_type === 'product') {
            $match = (int)$item['product_id'] === $rid;
        } elseif ($rule->apply_type === 'product_variant') {
            $match = !empty($item['variant_id']) && (int)$item['variant_id'] === $rvid;
        } elseif ($rule->apply_type === 'product_catalogue') {
            $match = in_array($rcatid, array_map('intval', $item['catalogue_ids'] ?? []));
        }
        
        return $match;
    }

    protected function applyBXGY(&$item, $promo, $qty)
    {
        // Use the promo price before setting to 0 for tracking the "value" saved by the gift
        $base = $promo->combine_with_product_discount ? $item['prices']['promo'] : $item['prices']['retail'];
        $unitDisc = 0;
        if ($promo->discount_type === 'percentage') $unitDisc = $base * ($promo->discount_value / 100);
        elseif ($promo->discount_type === 'fixed_amount') $unitDisc = min($promo->discount_value, $base);
        elseif ($promo->discount_type === 'free') { $unitDisc = $base; $item['is_gift'] = true; }

        if (!empty($item['prices']['is_wholesale_tier']) && $promo->discount_type !== 'free') $unitDisc = 0;
        $totalDisc = $unitDisc * $qty;
        $item['price'] = $base - ($totalDisc / $item['quantity']);
        $item['bxgy_unit_discount'] = $unitDisc;
        $item['product_promotions'] = [['id' => $promo->id, 'name' => $promo->name, 'type' => 'buy_x_get_y', 'discount' => $totalDisc, 'apply_qty' => $qty]];
    }

    protected function generateRowId(int $pid, ?int $vid = null, ?int $prid = null): string
    {
        $id = $pid . '_' . ($vid ?: '0');
        return $prid ? 'reward_' . $prid . '_' . $id : $id;
    }

    protected function getStockLevel($product, $variant): int
    {
        if ($product->management_type === 'batch') {
            $batches = $variant ? $variant->batches : $product->batches;
            return (int)$batches->sum(fn($b) => $b->warehouseStocks->sum('stock_quantity'));
        }
        $stocks = $variant ? $variant->warehouseStocks : $product->warehouseStocks;
        return (int)$stocks->sum('stock_quantity');
    }

    protected function countProductInCart($cart, $pid, $vid): int
    {
        $count = 0;
        foreach ($cart['items'] as $it) {
            if ($it['product_id'] == $pid && ($it['variant_id'] ?? '0') == ($vid ?: '0')) $count += $it['quantity'];
        }
        return $count;
    }
}
