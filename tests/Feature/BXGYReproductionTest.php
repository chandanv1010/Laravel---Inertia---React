<?php

// Mocking some Laravel stuff to run this script standalone or via artisan
// Actually, it's easier to create a temporary test controller or use an existing test environment.
// I'll create a simple PHP script that I can run with 'php artisan tinker' or just run directly.

namespace Tests\Manual;

use App\Models\Product;
use App\Models\Promotion;
use App\Services\Impl\V1\Cart\CartService;
use Illuminate\Support\Facades\Session;
use Tests\TestCase;

class BXGYTest extends TestCase
{
    public function testBXGYSplitting()
    {
        $cartService = app(CartService::class);
        $cartService->clear();

        // Add 3 V18 (Product ID 6)
        // Note: I need to make sure variants are handled or NOT.
        // In the image, it seems standard.
        $cartService->add(6, null, 3);
        
        // Add 1 V12 (Product ID 392)
        $cartService->add(392, null, 1);

        $cart = $cartService->get();
        
        echo "\nFinal Cart Items:\n";
        foreach ($cart['items'] as $it) {
            $type = "NORMAL";
            if (!empty($it['is_gift'])) $type = "GIFT";
            if (strpos($it['row_id'], 'buy_') === 0) $type = "BUY_COND";
            
            echo sprintf("- [%s] %s | Qty: %d | Price: %s | RowID: %s | PromoID: %s\n", 
                $type, $it['name'], $it['quantity'], number_format($it['price']), $it['row_id'], $it['promo_id'] ?? 'NONE');
        }
        
        echo "\nSummary:\n";
        echo "Total Qty: " . $cart['total_quantity'] . "\n";
        echo "Final Total: " . number_format($cart['final_total']) . "\n";
    }
}
