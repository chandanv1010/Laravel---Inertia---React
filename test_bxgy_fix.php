<?php

/**
 * Script kiểm tra logic BXGY sau khi đã fix.
 * Kịch bản: Mua 2 Tặng 1 (Cùng loại).
 * Giỏ hàng có 3 sản phẩm.
 * Kết quả mong đợi: 2 sản phẩm giữ nguyên giá, 1 sản phẩm bị tách thành reward với giá 0.
 * Tổng số lượng vẫn là 3.
 */

// Mock các class cần thiết
class Product { 
    public $id; public $name; public $retail_price = 100000; 
    public function __construct($id, $name) { $this->id = $id; $this->name = $name; }
}

function collect($arr) {
    return new class($arr) {
        public $arr;
        function __construct($arr) { $this->arr = $arr; }
        function where($k, $v) { return collect(array_filter($this->arr, fn($i) => is_object($i) ? $i->$k == $v : $i[$k] == $v)); }
        function isEmpty() { return empty($this->arr); }
        function sum($k) { return array_sum(array_column($this->arr, $k)); }
        function first() { return reset($this->arr); }
    };
}

// Giả lập logic CartService rút gọn
class CartTest {
    public $items = [];

    public function generateRowId($productId, $variantId = 0, $promoId = null) {
        $id = $productId . '_' . ($variantId ?: '0');
        return $promoId ? 'reward_' . $promoId . '_' . $id : $id;
    }

    public function run() {
        $promo = (object)[
            'id' => 10,
            'name' => 'Mua 2 Tặng 1',
            'discount_type' => 'free',
            'buy_x_get_y_items' => collect([
                (object)['item_type' => 'buy', 'product_id' => 1, 'quantity' => 2, 'apply_type' => 'product'],
                (object)['item_type' => 'get', 'product_id' => 1, 'quantity' => 1, 'apply_type' => 'product'],
            ])
        ];

        // Giỏ hàng ban đầu: 3 cái Product 1
        $this->items = [
            '1_0' => [
                'row_id' => '1_0', 'product_id' => 1, 'variant_id' => 0,
                'quantity' => 3, 'price' => 100000, 
                'prices' => ['retail' => 100000, 'promo' => 100000],
                'catalogue_ids' => [1]
            ]
        ];

        echo "--- TRƯỚC KHI SAVE ---\n";
        $this->printCart();

        $this->saveSimulation([$promo]);

        echo "\n--- SAU KHI SAVE ---\n";
        $this->printCart();
    }

    private function printCart() {
        $totalQty = 0;
        foreach ($this->items as $id => $item) {
            echo "ID: $id | Qty: {$item['quantity']} | Price: {$item['price']}\n";
            $totalQty += $item['quantity'];
        }
        echo "TỔNG SỐ LƯỢNG: $totalQty\n";
    }

    private function saveSimulation($promos) {
        // Logic gộp (Simplifed)
        // ... skip ...

        foreach ($promos as $promo) {
            $buyRules = $promo->buy_x_get_y_items->where('item_type', 'buy');
            $getRules = $promo->buy_x_get_y_items->where('item_type', 'get');

            $matchingRows = [];
            foreach ($this->items as $id => $item) {
                $matchingRows[$id] = ['qty' => $item['quantity'], 'isBuy' => true, 'isGet' => true, 'price' => $item['price']];
            }

            $ruleBuyQty = $buyRules->sum('quantity'); // 2
            $ruleGetQty = $getRules->sum('quantity'); // 1
            $unitQty = $ruleBuyQty + $ruleGetQty; // 3

            $totalPool = 3;
            $numRewards = floor($totalPool / $unitQty) * $ruleGetQty; // 1

            $quota = $numRewards;
            foreach ($getRules as $getRule) {
                if ($quota <= 0) break;

                // FIX LOGIC: Split from pool
                foreach ($matchingRows as $rowId => $m) {
                    if ($quota <= 0) break;
                    $item = &$this->items[$rowId];
                    $take = min($item['quantity'], $quota);

                    $rewardRowId = $this->generateRowId($item['product_id'], $item['variant_id'], $promo->id);
                    
                    if (!isset($this->items[$rewardRowId])) {
                        $this->items[$rewardRowId] = $item;
                        $this->items[$rewardRowId]['row_id'] = $rewardRowId;
                        $this->items[$rewardRowId]['quantity'] = $take;
                    } else {
                        $this->items[$rewardRowId]['quantity'] += $take;
                    }

                    $item['quantity'] -= $take;
                    if ($item['quantity'] <= 0) unset($this->items[$rowId]);

                    // applyBXGYToItem logic
                    $this->items[$rewardRowId]['price'] = 0; 
                    $quota -= $take;
                }
            }
        }
    }
}

(new CartTest())->run();
