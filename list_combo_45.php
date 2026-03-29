<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Product;
use App\Models\Promotion;

$comboId = 45;
$promotion = Promotion::with('combo_items')->find($comboId);

if (!$promotion) {
    echo "Promotion $comboId not found\n";
    exit;
}

echo "Combo: " . $promotion->name . "\n";
echo "Items in this combo:\n";
foreach ($promotion->combo_items as $item) {
    $p = Product::find($item->product_id);
    if ($p) {
        echo "- ID: " . $p->id . ", Name: " . $p->getNameAttribute() . " (Variant: " . ($item->product_variant_id ?? 'All') . ")\n";
    } else {
        echo "- ID: " . $item->product_id . " (Product not found!)\n";
    }
}
