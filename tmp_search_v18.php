<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$search = 'V18';
$products = App\Models\Product::whereHas('languages', function($q) use ($search) {
    $q->where('product_language.name', 'like', "%$search%");
})->with('languages')->get();

echo "Searching for '$search':\n";
foreach ($products as $p) {
    $name = $p->languages->first()?->pivot?->name ?? 'N/A';
    echo "ID: {$p->id} | SKU: {$p->sku} | Name: $name\n";
}

$search = 'V12';
$products = App\Models\Product::whereHas('languages', function($q) use ($search) {
    $q->where('product_language.name', 'like', "%$search%");
})->with('languages')->get();

echo "\nSearching for '$search':\n";
foreach ($products as $p) {
    $name = $p->languages->first()?->pivot?->name ?? 'N/A';
    echo "ID: {$p->id} | SKU: {$p->sku} | Name: $name\n";
}
