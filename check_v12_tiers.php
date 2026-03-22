<?php
include 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$p = \App\Models\Product::with('pricingTiers')->find(392);
if ($p) {
    echo "Product: " . $p->name . "\n";
    echo "Retail: " . $p->retail_price . "\n";
    echo "Tiers count: " . $p->pricingTiers->count() . "\n";
    foreach ($p->pricingTiers as $t) {
        echo "Qty >= " . $t->min_quantity . " -> Price: " . $t->price . "\n";
    }
} else {
    echo "Product 392 not found\n";
}
