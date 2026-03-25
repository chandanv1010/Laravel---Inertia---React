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
        $baseItems = [];
        // 1. CLEANUP & CONSOLIDATION (Full Reset for Re-evaluation)
        // We MUST separate User-Added items from System-Injected gifts to avoid exponential growth
        $baseItems = [];
        foreach ($cart['items'] as $it) {
            // IGNORE items with promo_id (these was system-injected gifts from previous run)
            if (!empty($it['promo_id'])) continue;

            $key = $it['product_id'] . '_' . ($it['variant_id'] ?? '0');
            if (!isset($baseItems[$key])) {
                $baseItems[$key] = $it;
                $baseItems[$key]['row_id'] = $key;
                $baseItems[$key]['promo_id'] = null;
                $baseItems[$key]['is_gift'] = false;
                unset($baseItems[$key]['bxgy_unit_discount'], $baseItems[$key]['product_promotions'], $baseItems[$key]['spent_quantity']);
            } else {
                $baseItems[$key]['quantity'] += $it['quantity'];
                unset($baseItems[$key]['spent_quantity']);
            }
        }
        $consolidated = $baseItems; 
        $cart['items'] = $consolidated; // Now cart only contains consolidated base items

        // 2. BASE PRICING
        foreach ($cart['items'] as &$item) {
            if (!empty($item['is_gift']) || !empty($item['promo_id'])) continue;
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

        // 3. BXGY (Isolated for maintainability)
        $bxgyDisc = $this->applyBuyXGetYPromotions($cart);

        foreach ($cart['items'] as $rid => $it) {
            \Illuminate\Support\Facades\Log::info("  [POST-BXGY] RID: $rid, Qty: {$it['quantity']}, Price: {$it['price']}");
        }

        // 3.3 LABEL PROPAGATION
        // Ensure all items eligible for BXGY (buy or get) have the label, even if not currently rewards.
        $bxgyPromos = \App\Models\Promotion::where('publish', 2)->where('type', 'buy_x_get_y')->expiryStatus('active')->orderBy('id', 'desc')->get();
        foreach ($cart['items'] as &$it) {
            if (!empty($it['promo_id'])) continue; 
            if (!isset($it['product_promotions'])) $it['product_promotions'] = [];
            
            foreach ($bxgyPromos as $promo) {
                $buyRules = $promo->buy_x_get_y_items->where('item_type', 'buy');
                $getRules = $promo->buy_x_get_y_items->where('item_type', 'get');
                
                $mB = false; foreach ($buyRules as $r) if ($this->match($it, $r)) { $mB = true; break; }
                $mG = false; foreach ($getRules as $r) if ($this->match($it, $r)) { $mG = true; break; }
                
                if ($mB || $mG) {
                    $existing = collect($it['product_promotions'])->pluck('id')->toArray();
                    if (!in_array($promo->id, $existing)) {
                        $it['product_promotions'][] = [
                            'id' => $promo->id,
                            'name' => $promo->name,
                            'type' => 'buy_x_get_y',
                            'discount' => 0,
                            'is_potential' => true
                        ];
                    }
                }
            }
        }
        unset($it);
        $subAfterBXGY = 0; foreach ($cart['items'] as $it) $subAfterBXGY += ($it['price'] * $it['quantity']);

        // 4. ORDER PROMOS
        $orderPromos = $this->promotionPricingService->getActiveOrderPromotions();
        $stackDisc = 0;
        foreach ($orderPromos->filter(fn($p) => (bool)$p->combine_with_product_discount) as $p) {
            /** @var \App\Models\Promotion $p */
            $stackDisc += $this->promotionPricingService->calculateOrderPromotionDiscount($subAfterBXGY, $p);
        }
        $bestSingle = 0; $bestSinglePromo = null;
        foreach ($orderPromos as $p) {
            /** @var \App\Models\Promotion $p */
            $d = $this->promotionPricingService->calculateOrderPromotionDiscount($totalRetail, $p);
            if ($d > $bestSingle) { $bestSingle = $d; $bestSinglePromo = $p; }
        }

        if (($totalProdDisc + $bxgyDisc + $stackDisc) >= $bestSingle) {
            $orderDisc = $stackDisc;
        } else {
            \Illuminate\Support\Facades\Log::info("  [ORDER BRANCH] Using Best Single (Reset)");
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
                $vDist = $vs->calculateVoucherDiscount($cart['voucher_info'], $cart['items'], $subAfterBXGY - $orderDisc, $orderDisc);
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
        $cart['total_price'] = $totalRetail; // Show non-gift retail as "Tạm tính" base
        
        // Logical math for summary: Only subtract discounts that apply to the items in "Tạm tính"
        // (Gifts are already 0đ and shown in their own green box, so we don't subtract their "value" again here)
        $cart['discount_total'] = $totalProdDisc + $orderDisc + $vDist;
        $cart['final_total'] = max(0, $totalRetail - $cart['discount_total']);
        
        $cart['summary'] = [
            'total_retail' => $totalRetail,
            'total_product_discount' => $totalProdDisc,
            'buy_x_get_y_discount' => $bxgyDisc, // We still keep the value for data/reference
            'order_discount' => $orderDisc,
            'voucher_discount' => $vDist,
            'discount_total' => $cart['discount_total'],
            'final_total' => $cart['final_total'],
            'discount_breakdown' => [
                [
                    'label' => 'Giảm giá sản phẩm',
                    'amount' => $totalProdDisc,
                    'type' => 'product'
                ],
                [
                    'label' => 'Chiết khấu đơn hàng',
                    'amount' => $orderDisc,
                    'type' => 'order'
                ],
                [
                    'label' => 'Voucher',
                    'amount' => $vDist,
                    'type' => 'voucher'
                ]
            ]
        ];
        foreach ($cart['items'] as &$it) {
            $it['updated_at'] = microtime(true);
        }
        unset($it);

        // SORT CART: Normal items first, then BXGY rewards
        uasort($cart['items'], function($a, $b) {
            $isRa = !empty($a['promo_id']);
            $isRb = !empty($b['promo_id']);
            if ($isRa != $isRb) return $isRa ? 1 : -1;
            // Stable sort by product_id within categories
            return ($a['product_id'] <=> $b['product_id']);
        });

        foreach($cart['items'] as $it) {
             \Illuminate\Support\Facades\Log::info("  [FINAL CART] RID: {$it['row_id']}, Qty: {$it['quantity']}, Price: {$it['price']}");
        }

        Session::put($this->sessionKey, $cart);
        } finally {
            $this->isSaving = false;
        }
    }

    protected function applyBuyXGetYPromotions(array &$cart): float
    {
        $promos = \App\Models\Promotion::where('publish', 2)->where('type', 'buy_x_get_y')->expiryStatus('active')->orderBy('id', 'desc')->get();
        $bxgyDisc = 0;

        foreach ($promos as $promo) {
            $buyRules = $promo->buy_x_get_y_items->where('item_type', 'buy');
            $getRules = $promo->buy_x_get_y_items->where('item_type', 'get');
            if ($buyRules->isEmpty() || $getRules->isEmpty()) continue;

            $buyNeeded = (int)$buyRules->sum('quantity');

            $pool = [];
            foreach ($cart['items'] as $rid => $it) {
                if (!empty($it['promo_id'])) continue; 
                $avail = (int)$it['quantity'] - (int)($it['spent_quantity'] ?? 0);
                if ($avail <= 0) continue;

                $isB = false; foreach ($buyRules as $r) if ($this->match($it, $r)) { $isB = true; break; }
                $isG = false; foreach ($getRules as $r) if ($this->match($it, $r)) { $isG = true; break; }
                
                if ($isB || $isG) {
                    $pool[$rid] = [
                        'qty' => $avail, 
                        'isB' => $isB, 
                        'isG' => $isG, 
                        'price' => $it['prices']['retail'] ?? 0,
                        'isSelf' => ($isB && $isG)
                    ];
                }
            }
            
            uasort($pool, function($a, $b) {
                if ($a['isSelf'] && !$b['isSelf']) return -1;
                if (!$a['isSelf'] && $b['isSelf']) return 1;
                return ($b['price'] ?? 0) <=> ($a['price'] ?? 0);
            });

            $bQty = 0; foreach ($pool as $p) if ($p['isB']) $bQty += $p['qty'];
            
            if ($promo->discount_type === 'free') {
                $isGiftPromo = true;
                $sessionsForInj = ($buyNeeded > 0) ? (int)floor($bQty / $buyNeeded) : 0;
                if ($sessionsForInj > 0) {
                    foreach ($getRules as $gr) {
                        $pid = (int)$gr->product_id;
                        $vid = (int)$gr->product_variant_id;
                        $neededOverall = $sessionsForInj * (int)$gr->quantity;
                        $currentGifts = 0;
                        foreach ($cart['items'] as $it) {
                            if (!empty($it['is_gift']) && (int)$it['product_id'] === $pid && (int)($it['variant_id'] ?? 0) === ($vid ?: 0)) {
                                $currentGifts += $it['quantity'];
                            }
                        }
                        if ($currentGifts < $neededOverall) {
                            $this->internalInjection($cart, $pid, $vid ?: null, $neededOverall - $currentGifts, (int)$promo->id, $isGiftPromo);
                        }
                    }
                }
            }

            $pool = [];
            foreach ($cart['items'] as $rid => $it) {
                if (!empty($it['promo_id'])) continue;
                $avail = (int)$it['quantity'] - (int)($it['spent_quantity'] ?? 0);
                if ($avail <= 0) continue;
                $isB = false; foreach ($buyRules as $r) if ($this->match($it, $r)) { $isB = true; break; }
                $isG = false; foreach ($getRules as $r) if ($this->match($it, $r)) { $isG = true; break; }
                if ($isB || $isG) {
                    $pool[$rid] = ['qty' => $avail, 'isB' => $isB, 'isG' => $isG, 'price' => $it['prices']['retail'] ?? 0, 'isSelf' => ($isB && $isG)];
                }
            }
            uasort($pool, function($a, $b) {
                if ($a['isSelf'] && !$b['isSelf']) return -1;
                if (!$a['isSelf'] && $b['isSelf']) return 1;
                return ($b['price'] ?? 0) <=> ($a['price'] ?? 0);
            });

            $totalBuyQty = 0;
            foreach ($pool as $p) if ($p['isB']) $totalBuyQty += $p['qty'];
            $overlapGetQty = 0;
            foreach ($getRules as $gr) {
                foreach ($buyRules as $br) {
                    if ($gr->product_id == $br->product_id && $gr->product_variant_id == $br->product_variant_id) {
                        $overlapGetQty += (int)$gr->quantity;
                    }
                }
            }

            $itemsPerSession = $buyNeeded + $overlapGetQty;
            $sessions = ($itemsPerSession > 0) ? (int)floor($totalBuyQty / $itemsPerSession) : 0;
            if ($sessions <= 0) continue;

            foreach ($cart['items'] as $grid => $it) {
                if (($it['promo_id'] ?? null) == $promo->id) {
                    $this->applyBXGY($cart['items'][$grid], $promo, $it['quantity']);
                    $bxgyDisc += (($cart['items'][$grid]['bxgy_unit_discount'] ?? 0) * $it['quantity']);
                }
            }

            foreach ($getRules as $gr) {
                $ruleQuota = $sessions * (int)$gr->quantity;
                $ruleExistingCount = 0;
                foreach ($cart['items'] as $it) {
                    if (($it['promo_id'] ?? null) == $promo->id && (int)$it['product_id'] === (int)$gr->product_id && (int)($it['variant_id'] ?? 0) === (int)($gr->product_variant_id ?? 0)) {
                        $ruleExistingCount += (int)$it['quantity'];
                    }
                }
                $remainingQuota = $ruleQuota - $ruleExistingCount;
                if ($remainingQuota <= 0) continue;

                foreach ($pool as $rid => &$p) {
                    if ($remainingQuota <= 0) break;
                    if (!isset($cart['items'][$rid]) || $p['qty'] <= 0) continue;
                    if (!$this->match($cart['items'][$rid], $gr)) continue;

                    $take = min($p['qty'], $remainingQuota);
                    $rewId = $this->generateRowId((int)$cart['items'][$rid]['product_id'], (int)($cart['items'][$rid]['variant_id'] ?? 0), (int)$promo->id, 'reward');

                    if (isset($cart['items'][$rewId])) {
                        $cart['items'][$rewId]['quantity'] += $take;
                    } else {
                        $cart['items'][$rewId] = $cart['items'][$rid];
                        $cart['items'][$rewId]['row_id'] = $rewId;
                        $cart['items'][$rewId]['quantity'] = $take;
                        $cart['items'][$rewId]['promo_id'] = $promo->id;
                        unset($cart['items'][$rewId]['spent_quantity']);
                    }
                    $this->applyBXGY($cart['items'][$rewId], $promo, $cart['items'][$rewId]['quantity']);
                    $bxgyDisc += ($cart['items'][$rewId]['bxgy_unit_discount'] ?? 0) * $take;

                    $cart['items'][$rid]['quantity'] = max(0, $cart['items'][$rid]['quantity'] - $take);
                    $p['qty'] -= $take;
                    $remainingQuota -= $take;
                    if ($cart['items'][$rid]['quantity'] <= 0) unset($cart['items'][$rid]);
                }
                unset($p);
            }

            $buyToMark = $sessions * $buyNeeded;
            foreach ($pool as $rid => &$p) {
                if ($buyToMark <= 0) break;
                if (!isset($cart['items'][$rid]) || $p['qty'] <= 0) continue;
                if (!$p['isB']) continue;
                $take = min($p['qty'], $buyToMark);
                $cart['items'][$rid]['spent_quantity'] = (int)($cart['items'][$rid]['spent_quantity'] ?? 0) + $take;
                $p['qty'] -= $take;
                $buyToMark -= $take;
            }
            unset($p);
        }
        return (float)$bxgyDisc;
    }

    protected function internalInjection(array &$cart, int $productId, ?int $variantId = null, int $quantity = 1, ?int $promoId = null, bool $isGift = true): void
    {
        $this->performAdd($cart, $productId, $variantId, $quantity, $promoId, $isGift);
    }

    protected function match($item, $rule): bool
    {
        if ($rule->apply_type === 'all') return true;
        
        if ($rule->apply_type === 'product') {
            return (int)$item['product_id'] === (int)$rule->product_id;
        }
        
        if ($rule->apply_type === 'product_variant') {
            return (int)$item['product_id'] === (int)$rule->product_id && 
                   (int)($item['variant_id'] ?? 0) === (int)($rule->product_variant_id ?? 0);
        }
        
        if ($rule->apply_type === 'product_catalogue') {
            $itemCatalogues = $item['catalogue_ids'] ?? [];
            return in_array($rule->product_catalogue_id, $itemCatalogues);
        }
        
        return false;
    }

    protected function applyBXGY(&$item, $promo, $qty)
    {
        // Use the promo price before setting to 0 for tracking the "value" saved by the gift
        $base = $promo->combine_with_product_discount ? ($item['prices']['promo'] ?? 0) : ($item['prices']['retail'] ?? 0);
        $unitDisc = 0;
        
        \Illuminate\Support\Facades\Log::info("  [BXGY DEBUG] PID {$item['product_id']}, Type: {$promo->discount_type}, Val: {$promo->discount_value}");

        if ($promo->discount_type === 'percentage') {
            $unitDisc = $base * ($promo->discount_value / 100);
            $item['is_gift'] = false;
        } elseif ($promo->discount_type === 'fixed_amount') {
            $unitDisc = min((float)$promo->discount_value, $base);
            $item['is_gift'] = false;
        } elseif ($promo->discount_type === 'free') {
            $unitDisc = $base;
            $item['is_gift'] = true;
        }

        if (!empty($item['prices']['is_wholesale_tier']) && $promo->discount_type !== 'free') {
            $unitDisc = 0;
        }
        
        $totalDisc = $unitDisc * $qty;
        $unitAmount = ($totalDisc / $item['quantity']);
        $item['price'] = $base - $unitAmount;
        $item['bxgy_unit_discount'] = $unitDisc;
        $item['product_promotions'] = [['id' => $promo->id, 'name' => $promo->name, 'type' => 'buy_x_get_y', 'discount' => $totalDisc, 'apply_qty' => $qty]];

        \Illuminate\Support\Facades\Log::info("  [BXGY] Applied Promo {$promo->id}: Base: $base, UnitDisc: $unitDisc, Final: {$item['price']}");
    }

    protected function generateRowId(int $pid, ?int $vid = null, ?int $prid = null, string $type = 'reward'): string
    {
        $id = $pid . '_' . ($vid ?: '0');
        return $prid ? $type . '_' . $prid . '_' . $id : $id;
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
