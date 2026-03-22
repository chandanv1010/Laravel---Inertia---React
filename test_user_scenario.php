<?php

/**
 * Script kiểm tra kịch bản người dùng:
 * 1. Có 2 sản phẩm (Chưa có quà).
 * 2. Nhấn + để lên 3.
 * 3. Kiểm tra xem kết quả là (2 + 1) hay (3 + 1).
 */

class UserScenarioTest {
    public $items = [];

    public function generateRowId($productId, $variantId = 0, $promoId = null) {
        $id = $productId . '_' . ($variantId ?: '0');
        return $promoId ? 'reward_' . $promoId . '_' . $id : $id;
    }

    public function run() {
        // Bước 1: Có 2 sản phẩm
        $this->items = [
            '6_0' => ['row_id' => '6_0', 'product_id' => 6, 'variant_id' => 0, 'quantity' => 2, 'price' => 389000]
        ];

        echo "--- BAN ĐẦU (2 cái) ---\n";
        $this->printCart();

        // Bước 2: Update lên 3
        echo "\nUpdate Row '6_0' to Qty 3...\n";
        $this->updateSimulation('6_0', 3);

        echo "\n--- SAU KHI UPDATE (Mong đợi 2 + 1) ---\n";
        $this->printCart();
    }

    private function printCart() {
        $totalQty = 0;
        foreach ($this->items as $id => $item) {
            echo "ID: $id | Qty: {$item['quantity']} | Price: {$item['price']} " . (isset($item['promo_id']) ? "[REWARD]" : "[PAID]") . "\n";
            $totalQty += $item['quantity'];
        }
        echo "TỔNG SỐ LƯỢNG: $totalQty\n";
    }

    private function updateSimulation($rowId, $quantity) {
        $targetItem = $this->items[$rowId];
        $totalGroupQuantity = 0;
        foreach ($this->items as $item) {
            if ($item['product_id'] == 6) $totalGroupQuantity += $item['quantity'];
        }

        $delta = $quantity - $targetItem['quantity']; // 3 - 2 = 1
        $newTotalQuantity = $totalGroupQuantity + $delta; // 2 + 1 = 3

        $this->items = []; // Clear
        $properId = '6_0';
        $this->items[$properId] = $targetItem;
        $this->items[$properId]['row_id'] = $properId;
        $this->items[$properId]['quantity'] = $newTotalQuantity;
        unset($this->items[$properId]['promo_id']);

        $this->saveSimulation();
    }

    private function saveSimulation() {
        // Consolidation (Already done in update simulation)
        
        $totalPool = 0;
        foreach($this->items as $item) $totalPool += $item['quantity'];

        $ruleBuyQty = 2; $ruleGetQty = 1; $unitQty = 3;
        $numRewards = floor($totalPool / $unitQty) * $ruleGetQty; // floor(3/3)*1 = 1

        $quota = $numRewards;
        // Giả lập split
        foreach ($this->items as $rowId => &$item) {
            if ($quota <= 0) break;
            $take = min($item['quantity'], $quota);
            
            $rewardRowId = $this->generateRowId(6,0,3);
            $this->items[$rewardRowId] = $item;
            $this->items[$rewardRowId]['row_id'] = $rewardRowId;
            $this->items[$rewardRowId]['quantity'] = $take;
            $this->items[$rewardRowId]['promo_id'] = 3;
            $this->items[$rewardRowId]['price'] = 252850;

            $item['quantity'] -= $take;
            if ($item['quantity'] <= 0) unset($this->items[$rowId]);
        }
    }
}

(new UserScenarioTest())->run();
