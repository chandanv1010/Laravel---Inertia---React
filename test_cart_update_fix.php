<?php

/**
 * Script kiểm tra logic update() sau khi đã fix cho nhóm sản phẩm bị tách.
 * Kịch bản: 
 * 1. Giỏ hàng có 4 sản phẩm (3 Paid + 1 Reward) - Tổng là 4.
 * 2. Thực hiện update(+) trên dòng Reward (từ 1 lên 2).
 * 3. Kết quả mong đợi: Tổng số lượng phải là 5 (4 Paid + 1 Reward).
 */

class CartUpdateTest {
    public $items = [];

    public function generateRowId($productId, $variantId = 0, $promoId = null) {
        $id = $productId . '_' . ($variantId ?: '0');
        return $promoId ? 'reward_' . $promoId . '_' . $id : $id;
    }

    public function run() {
        // Trạng thái ban đầu: 3 cái Paid (1_0), 1 cái Reward (reward_10_1_0)
        // Lưu ý: Trong thực tế, 4 cái sẽ được chia thành (3 và 1) nếu là Buy 2 Get 1.
        $this->items = [
            '1_0' => ['row_id' => '1_0', 'product_id' => 1, 'variant_id' => 0, 'quantity' => 3, 'price' => 100000],
            'reward_10_1_0' => ['row_id' => 'reward_10_1_0', 'product_id' => 1, 'variant_id' => 0, 'quantity' => 1, 'price' => 0, 'promo_id' => 10]
        ];

        echo "--- TRƯỚC KHI UPDATE ---\n";
        $this->printCart();

        // Giả lập update(+) trên dòng Reward: Qty 1 -> 2
        echo "\nUpdate Row 'reward_10_1_0' to Qty 2...\n";
        $this->updateSimulation('reward_10_1_0', 2);

        echo "\n--- SAU KHI UPDATE & SAVE ---\n";
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

    private function updateSimulation($rowId, $quantity) {
        if (isset($this->items[$rowId])) {
            $targetItem = $this->items[$rowId];
            $productId = $targetItem['product_id'];
            $variantId = $targetItem['variant_id'] ?? 0;

            // [FIX LOGIC]
            $totalGroupQuantity = 0;
            $relatedKeys = [];
            foreach ($this->items as $id => $item) {
                if ($item['product_id'] == $productId && ($item['variant_id'] ?? 0) == $variantId) {
                    $totalGroupQuantity += $item['quantity'];
                    $relatedKeys[] = $id;
                }
            }

            $delta = $quantity - $targetItem['quantity']; // 2 - 1 = +1
            $newTotalQuantity = $totalGroupQuantity + $delta; // 4 + 1 = 5

            foreach ($relatedKeys as $rk) { unset($this->items[$rk]); }

            if ($newTotalQuantity > 0) {
                $properId = $this->generateRowId($productId, $variantId);
                $this->items[$properId] = $targetItem;
                $this->items[$properId]['row_id'] = $properId;
                $this->items[$properId]['quantity'] = $newTotalQuantity;
                unset($this->items[$properId]['promo_id']);
            }

            // Mock save() redistribution logic (Buy 2 Get 1)
            $this->saveSimulation();
        }
    }

    private function saveSimulation() {
        // Giả sử 5 sản phẩm -> Buy 2 Get 1 -> 4 Paid + 1 Reward
        $rowId = '1_0';
        if (isset($this->items[$rowId])) {
            $total = $this->items[$rowId]['quantity'] ?? 0;
            if ($total == 5) {
                $this->items[$rowId]['quantity'] = 4;
                $rewardId = $this->generateRowId(1, 0, 10);
                $this->items[$rewardId] = $this->items[$rowId];
                $this->items[$rewardId]['row_id'] = $rewardId;
                $this->items[$rewardId]['quantity'] = 1;
                $this->items[$rewardId]['price'] = 0;
            }
        }
    }
}

(new CartUpdateTest())->run();
