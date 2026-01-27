<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupE2EProducts extends Command
{
    /**
     * Delete products created by Playwright E2E tests.
     *
     * We match by patterns used in tests:
     * - product_language pivot name like "E2E[%"
     * - product_language pivot canonical like "e2e-%"
     * - routers canonical like "e2e-%"
     */
    protected $signature = 'e2e:cleanup-products {--dry-run : Only show how many records would be removed}';

    protected $description = 'Remove products created by E2E tests (E2E[*] / e2e-*)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $ids = Product::query()
            ->withTrashed()
            ->where(function ($q) {
                $q->whereHas('languages', function ($lang) {
                    // Pivot table is product_language
                    $lang->where(function ($sub) {
                        $sub->where('product_language.name', 'like', 'E2E[%')
                            ->orWhere('product_language.canonical', 'like', 'e2e-%');
                    });
                })->orWhereHas('routers', function ($router) {
                    $router->where('canonical', 'like', 'e2e-%');
                });
            })
            ->pluck('id')
            ->all();

        if (empty($ids)) {
            $this->info('No E2E products found.');
            return self::SUCCESS;
        }

        $this->info('Found ' . count($ids) . ' E2E product(s).');

        if ($dryRun) {
            $this->comment('Dry-run mode: nothing deleted.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($ids) {
            // Clean morph pivot rows (no FK cascade)
            DB::table('taggables')
                ->where('taggable_type', Product::class)
                ->whereIn('taggable_id', $ids)
                ->delete();

            // Remove routers explicitly (morph table; might not have FK cascade)
            DB::table('routers')
                ->where('routerable_type', Product::class)
                ->whereIn('routerable_id', $ids)
                ->delete();

            // Hard delete products so FK cascades remove variants, tiers, pivots, etc.
            Product::withTrashed()
                ->whereIn('id', $ids)
                ->chunkById(200, function ($chunk) {
                    foreach ($chunk as $product) {
                        $product->forceDelete();
                    }
                });
        });

        $this->info('Deleted E2E products successfully.');
        return self::SUCCESS;
    }
}

