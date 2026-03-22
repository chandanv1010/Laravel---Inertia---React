<?php

use App\Models\Product;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$name = 'Áo Sơ Mi Nam Caro Ngắn Tay V18';
$product = Product::whereHas('languages', function($q) use ($name) {
    $q->where('name', 'like', "%$name%");
})->first();

if (!$product) {
    echo "Product not found\n";
    exit;
}

echo "Product: {$product->id} - Name: {$name}\n";
echo "Retail Price: {$product->retail_price}\n";
echo "Pricing Tiers:\n";
foreach ($product->pricingTiers as $tier) {
    echo "- Min: {$tier->min_quantity}, Max: " . ($tier->max_quantity ?? 'null') . ", Price: {$tier->price}\n";
}
