<?php

/**
 * Script mô phỏng chi tiết CartService::save() để tìm lỗi mất sản phẩm.
 */

class Simulation {
    public function matchRule($item, $rule) {
        return $item['product_id'] == $rule->product_id;
    }

    public function run() {
        // Giả lập Promotion: Mua 2 Tặng 1 (Buy 2 Get 1)
        $promo = (object)[
            'id' => 100,
            'name' => 'Mua 2 Tặng 1 Cùng Loại',
            'discount_type' => 'percentage',
            'discount_value' => 100,
            'combine_with_product_discount' => false,
            'buy_x_get_y_items' => collect([
                (object)['item_type' => 'buy', 'product_id' => 1, 'quantity' => 2, 'apply_type' => 'product'],
                (object)['item_type' => 'get', 'product_id' => 1, 'quantity' => 1, 'apply_type' => 'product'],
            ])
        ];

        // 1. Trạng thái ban đầu: Giỏ hàng có 3 sản phẩm (sau khi update Qty lên 3)
        $cart = [
            'items' => [
                '1_0' => [
                    'row_id' => '1_0',
                    'product_id' => 1,
                    'variant_id' => null,
                    'quantity' => 3,
                    'prices' => ['retail' => 459000, 'promo' => 459000],
                    'price' => 459000,
                    'catalogue_ids' => [1]
                ]
            ]
        ];

        echo "--- Initial State ---\n";
        $this->printCart($cart);

        // 2. Chạy logic save()
        $this->saveSimulation($cart, [$promo]);

        echo "\n--- After Save() ---\n";
        $this->printCart($cart);
    }

    private function printCart($cart) {
        $total = 0;
        foreach ($cart['items'] as $id => $item) {
            echo "Row: $id | Product: {$item['product_id']} | Qty: {$item['quantity']} | Price: {$item['price']}\n";
            $total += $item['quantity'];
        }
        echo "Total Items: $total\n";
    }

    private function saveSimulation(&$cart, $buyXGetYPromotions) {
        // 1. Consolidation (Skip is_gift, merge rest)
        $consolidated = [];
        foreach ($cart['items'] as $item) {
            if (!empty($item['is_gift'])) continue;
            $key = $item['product_id'] . '_' . ($item['variant_id'] ?? '0');
            if (!isset($consolidated[$key])) {
                $consolidated[$key] = $item;
                $consolidated[$key]['row_id'] = $key;
                $consolidated[$key]['promo_id'] = null;
                unset($consolidated[$key]['product_promotions']);
            } else {
                $consolidated[$key]['quantity'] += $item['quantity'];
            }
        }
        $cart['items'] = $consolidated;

        // 2. Product pricing (Mock)
        foreach ($cart['items'] as &$item) {
            $item['prices'] = ['retail' => 459000, 'promo' => 459000];
            $item['price'] = 459000;
        }

        // 3. BXGY
        $matchRule = [$this, 'matchRule'];

        foreach ($buyXGetYPromotions as $promo) {
            $buyRules = $promo->buy_x_get_y_items->where('item_type', 'buy');
            $getRules = $promo->buy_x_get_y_items->where('item_type', 'get');

            $matchingRows = [];
            foreach ($cart['items'] as $rowId => $item) {
                if (!empty($item['is_gift']) || isset($item['promo_id'])) continue;
                $matchesBuy = false;
                foreach ($buyRules as $rule) { if ($this->matchRule($item, (array)$rule)) $matchesBuy = true; }
                $matchesGet = false;
                foreach ($getRules as $rule) { if ($this->matchRule($item, (array)$rule)) $matchesGet = true; }

                if ($matchesBuy || $matchesGet) {
                    $matchingRows[$rowId] = ['qty' => $item['quantity'], 'isBuy' => $matchesBuy, 'isGet' => $matchesGet, 'price' => $item['price']];
                }
            }

            $ruleBuyQty = $buyRules->sum('quantity');
            $ruleGetQty = $getRules->sum('quantity');
            $unitQty = $ruleBuyQty + $ruleGetQty; // 3

            $totalPool = array_sum(array_column($matchingRows, 'qty')); // 3
            $numRewards = floor($totalPool / $unitQty) * $ruleGetQty; // 1

            if ($numRewards <= 0) continue;

            $quota = $numRewards;
            foreach ($getRules as $getRule) {
                if ($quota <= 0) break;
                // Simplified: assuming discount type is percentage 100
                foreach ($matchingRows as $rowId => $m) {
                    if ($quota <= 0) break;
                    if (!$m['isGet'] || !isset($cart['items'][$rowId])) continue;

                    $item = &$cart['items'][$rowId];
                    $take = min($item['quantity'], $quota); // 1

                    $itemSnapshot = $item; // Simple copy

                    $rewardRowId = 'reward_' . $promo->id . '_' . $item['product_id'] . '_' . ($item['variant_id'] ?? '0');
                    if (!isset($cart['items'][$rewardRowId])) {
                        $cart['items'][$rewardRowId] = $itemSnapshot;
                        $cart['items'][$rewardRowId]['row_id'] = $rewardRowId;
                        $cart['items'][$rewardRowId]['quantity'] = $take; // 1
                        $cart['items'][$rewardRowId]['promo_id'] = $promo->id;
                    } else {
                        $cart['items'][$rewardRowId]['quantity'] += $take;
                    }

                    $item['quantity'] -= $take; // 3 -> 2
                    if ($item['quantity'] <= 0) unset($cart['items'][$rowId]);
                    
                    // Simple apply BXGY
                    $cart['items'][$rewardRowId]['price'] = 0;
                    $quota -= $take;
                }
            }
        }
    }
}

// Add collect helper mock
function collect($arr) {
    return new class($arr) {
        function __construct($arr) { $this->arr = $arr; }
        function where($k, $v) { return collect(array_filter($this->arr, fn($i) => $i->$k == $v)); }
        function isEmpty() { return empty($this->arr); }
        function sum($k) { return array_sum(array_column($this->arr, $k)); }
        function first() { return reset($this->arr); }
    };
}

(new Simulation())->run();
