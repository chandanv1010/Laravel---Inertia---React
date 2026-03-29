<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Product;
use App\Services\Impl\V1\Promotion\PromotionPricingService;

$productId = 397;
$p = Product::find($productId);
if (!$p) {
    echo "Product $productId not found\n";
    exit;
}

$service = new PromotionPricingService();
$combos = $service->getCombosForProduct($p);

echo "Product: " . $p->name . " (ID: " . $p->id . ")\n";
echo "Combos found for this product:\n";
foreach ($combos as $combo) {
    echo "- " . $combo['name'] . " (ID: " . $combo['id'] . ")\n";
    echo "  Items in this combo:\n";
    $promotion = \App\Models\Promotion::find($combo['id']);
    foreach ($promotion->combo_items as $item) {
        echo "    * Product ID: " . $item->product_id . ", Variant ID: " . ($item->product_variant_id ?? 'NULL') . "\n";
    }
}
