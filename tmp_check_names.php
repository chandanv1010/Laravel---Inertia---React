<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

foreach ([6, 392] as $vid) {
    $v = App\Models\ProductVariant::with(['product.languages'])->find($vid);
    if ($v) {
        $pName = $v->product->languages->first()?->pivot?->name ?? 'N/A';
        echo "Variant ID: $vid | Product ID: {$v->product_id} | Product Name: $pName | Variant SKU: {$v->sku}\n";
    } else {
        echo "Variant ID: $vid | NOT FOUND\n";
    }
}
