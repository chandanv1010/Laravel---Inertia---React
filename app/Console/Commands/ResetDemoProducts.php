<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetDemoProducts extends Command
{
    protected $signature = 'demo:reset-products {--dry-run : Only show counts}';

    protected $description = 'Delete all products and related data (for demo reset)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $productCount = Product::withTrashed()->count();
        $this->info("Products (including trashed): {$productCount}");

        if ($dryRun) {
            $this->comment('Dry-run: nothing deleted.');
            return self::SUCCESS;
        }

        $driver = DB::getDriverName();
        $disableFk = fn () => null;
        $enableFk = fn () => null;

        if ($driver === 'mysql') {
            $disableFk = fn () => DB::statement('SET FOREIGN_KEY_CHECKS=0');
            $enableFk = fn () => DB::statement('SET FOREIGN_KEY_CHECKS=1');
        } elseif ($driver === 'sqlite') {
            $disableFk = fn () => DB::statement('PRAGMA foreign_keys = OFF');
            $enableFk = fn () => DB::statement('PRAGMA foreign_keys = ON');
        }

        $disableFk();

        // Truncate/delete child tables first (safe across FK setups)
        $tables = [
            'product_variant_attributes',
            'product_variants',
            'pricing_tiers',
            'product_language',
            'product_catalogue_product',
            'product_batches',
            // morph / routing
            'taggables',
            'routers',
            // finally products
            'products',
        ];

        foreach ($tables as $t) {
            if (!DB::getSchemaBuilder()->hasTable($t)) {
                continue;
            }
            // Some tables may not allow truncate with FK; FK disabled above.
            DB::table($t)->truncate();
        }

        $enableFk();

        $this->info('All products reset successfully.');
        return self::SUCCESS;
    }
}

