<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ProductCatalogue;
use App\Models\Router;
use Illuminate\Support\Facades\DB;

class SyncCatalogueRouters extends Command
{
    protected $signature = 'sync:catalogue-routers';
    protected $description = 'Đồng bộ canonical giữa product_catalogue_language và routers';

    public function handle()
    {
        $languageId = config('app.language_id', 1);
        
        $catalogues = ProductCatalogue::with(['languages' => fn($q) => $q->where('language_id', $languageId)])
            ->where('publish', 2)
            ->get();
        
        $updated = 0;
        $created = 0;
        
        DB::beginTransaction();
        try {
            foreach ($catalogues as $catalogue) {
                $lang = $catalogue->languages->first();
                if (!$lang || !$lang->pivot->canonical) {
                    $this->warn("Catalogue ID {$catalogue->id} không có canonical trong language pivot");
                    continue;
                }
                
                $canonical = $lang->pivot->canonical;
                
                $router = Router::where('routerable_type', ProductCatalogue::class)
                    ->where('routerable_id', $catalogue->id)
                    ->first();
                
                if ($router) {
                    if ($router->canonical !== $canonical) {
                        $oldCanonical = $router->canonical;
                        $router->update(['canonical' => $canonical]);
                        $updated++;
                        $this->info("Updated: {$catalogue->id} | {$oldCanonical} -> {$canonical}");
                    }
                } else {
                    Router::create([
                        'routerable_type' => ProductCatalogue::class,
                        'routerable_id' => $catalogue->id,
                        'canonical' => $canonical,
                        'controller' => 'App\Http\Controllers\Frontend\Product\ProductCatalogueController',
                        'page' => 'ProductCataloguePage',
                    ]);
                    $created++;
                    $this->info("Created: {$catalogue->id} | {$canonical}");
                }
            }
            
            DB::commit();
            $this->info("Đã xong! Updated: {$updated}, Created: {$created}");
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Error: " . $e->getMessage());
        }
    }
}
