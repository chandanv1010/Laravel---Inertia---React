<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('demo:reset-products {--dry-run : Only show counts}', function () {
    $dryRun = (bool) $this->option('dry-run');

    $productCount = \App\Models\Product::withTrashed()->count();
    $this->info("Products (including trashed): {$productCount}");

    if ($dryRun) {
        $this->comment('Dry-run: nothing deleted.');
        return 0;
    }

    $driver = \Illuminate\Support\Facades\DB::getDriverName();
    if ($driver === 'mysql') {
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0');
    } elseif ($driver === 'sqlite') {
        \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = OFF');
    }

    $tables = [
        'product_variant_attributes',
        'product_variants',
        'pricing_tiers',
        'product_language',
        'product_catalogue_product',
        'product_batches',
        'taggables',
        'routers',
        'products',
    ];

    foreach ($tables as $t) {
        if (!\Illuminate\Support\Facades\DB::getSchemaBuilder()->hasTable($t)) {
            continue;
        }
        \Illuminate\Support\Facades\DB::table($t)->truncate();
    }

    if ($driver === 'mysql') {
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1');
    } elseif ($driver === 'sqlite') {
        \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = ON');
    }

    $this->info('All products reset successfully.');
    return 0;
})->purpose('Delete all products + related data (demo reset)');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');


