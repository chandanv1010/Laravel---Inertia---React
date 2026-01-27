<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use App\Models\Router;
use App\Http\Controllers\Frontend\Product\ProductController;

class SyncProductRouter extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:sync-product-router';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync canonical from ProductLanguage to Router table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting sync...');

        Product::with(['languages'])->chunk(100, function ($products) {
            foreach ($products as $product) {
                foreach ($product->languages as $language) {
                    $canonical = $language->pivot->canonical;
                    $languageId = $language->id;

                    if (empty($canonical)) {
                        continue;
                    }

                    // Check if router exists for this canonical
                    // We need to ensure we update the router for THIS product and THIS language
                    // OR create if not exists
                    
                    Router::updateOrCreate(
                        [
                            'routerable_id' => $product->id,
                            'routerable_type' => Product::class,
                            'language_id' => $languageId,
                        ],
                        [
                            'canonical' => $canonical,
                            'module' => 'products',
                            'next_component' => 'ProductDetail',
                            'controller' => ProductController::class,
                        ]
                    );
                    
                    // Also check if there are other routers with same canonical but diff ID?
                    // Ideally canonical should be unique.
                    // If we find a router with same canonical but different owner, that's a conflict.
                    // But for this fix, we prioritize the product's request.
                    
                    $this->info("Synced: {$product->name} ({$canonical})");
                }
            }
        });

        $this->info('Sync completed successfully!');
    }
}
