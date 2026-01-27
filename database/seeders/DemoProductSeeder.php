<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\ProductBatch;
use App\Services\Interfaces\Product\ProductServiceInterface;

class DemoProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        /** @var User|null $user */
        $user = User::query()->where('email', env('GRANT_PERMS_EMAIL', 'chandanv1010@gmail.com'))->first()
            ?: User::query()->first();
        if (!$user) {
            $this->command?->warn('No users found, skipping DemoProductSeeder.');
            return;
        }

        Auth::login($user);

        $catalogueIds = DB::table('product_catalogues')->pluck('id')->toArray();
        $brandIds = DB::table('product_brands')->pluck('id')->toArray();
        $warehouseIds = DB::table('warehouses')->pluck('id')->toArray();

        $count = (int) (env('DEMO_PRODUCT_COUNT', 200));
        $count = max(200, min(500, $count));

        /** @var ProductServiceInterface $productService */
        $productService = app(ProductServiceInterface::class);

        $this->command?->info("Seeding {$count} demo products...");

        for ($i = 1; $i <= $count; $i++) {
            $seed = (int) (microtime(true) * 1000) + $i;

            // Distribute types for easy identification in list:
            // - SINGLE basic
            // - VAR basic
            // - BATCH single
            // - BATCH + VAR
            // - IMEI single
            $typeBucket = $i % 20; // 0..19
            $managementType = 'basic';
            $hasVariants = false;
            if ($typeBucket < 8) { // 40%
                $managementType = 'basic';
                $hasVariants = false;
            } elseif ($typeBucket < 14) { // 30%
                $managementType = 'basic';
                $hasVariants = true;
            } elseif ($typeBucket < 17) { // 15%
                $managementType = 'batch';
                $hasVariants = false;
            } elseif ($typeBucket < 19) { // 10%
                $managementType = 'batch';
                $hasVariants = true;
            } else { // 5%
                $managementType = 'imei';
                $hasVariants = false;
            }

            $variantMode = ($i % 3) + 1; // 1..3

            $labels = [];
            $labels[] = $hasVariants ? 'VAR' : 'SINGLE';
            $labels[] = strtoupper($managementType); // BASIC|BATCH|IMEI
            $name = sprintf('DEMO[%s][%s] Product %03d', $labels[0], $labels[1], $i);
            $canonical = 'demo-' . Str::slug($name) . '-' . $seed;

            $album = [
                "https://picsum.photos/seed/{$seed}/800/800",
                "https://picsum.photos/seed/" . ($seed + 1) . "/800/800",
                "https://picsum.photos/seed/" . ($seed + 2) . "/800/800",
            ];

            $retail = (float) (rand(50, 500) * 1000);
            $wholesale = (float) (max(0, $retail - rand(5, 50) * 1000));
            $cost = (float) (max(0, $wholesale - rand(5, 30) * 1000));

            $attributes = [];
            $variants = [];

            if ($hasVariants) {
                // Modes:
                // 1) few variants (1 attribute, 2 values => 2)
                // 2) medium (2 attrs, 2x2 => 4)
                // 3) many (2 attrs, 3x3 => 9)
                if ($variantMode === 1) {
                    $attributes = [
                        ['id' => (string) $seed . '-a', 'name' => 'Màu', 'values' => ['Đỏ', 'Xanh']],
                    ];
                } elseif ($variantMode === 2) {
                    $attributes = [
                        ['id' => (string) $seed . '-a', 'name' => 'Màu', 'values' => ['Đỏ', 'Xanh']],
                        ['id' => (string) $seed . '-b', 'name' => 'Size', 'values' => ['S', 'M']],
                    ];
                } else {
                    $attributes = [
                        ['id' => (string) $seed . '-a', 'name' => 'Màu', 'values' => ['Đỏ', 'Xanh', 'Đen']],
                        ['id' => (string) $seed . '-b', 'name' => 'Size', 'values' => ['S', 'M', 'L']],
                    ];
                }

                // Build combinations
                $combos = [[]];
                foreach ($attributes as $attr) {
                    $next = [];
                    foreach ($combos as $combo) {
                        foreach ($attr['values'] as $val) {
                            $c = $combo;
                            $c[$attr['name']] = $val;
                            $next[] = $c;
                        }
                    }
                    $combos = $next;
                }

                foreach ($combos as $idx => $attrsMap) {
                    $vRetail = $retail + rand(-5, 20) * 1000;
                    $vWholesale = $wholesale + rand(-5, 10) * 1000;
                    $vCost = $cost + rand(-5, 10) * 1000;

                    $variants[] = [
                        'id' => (string) $seed . '-' . $idx,
                        'sku' => "DEMO-{$i}-V" . str_pad((string) ($idx + 1), 3, '0', STR_PAD_LEFT),
                        'barcode' => (string) rand(100000000000, 999999999999),
                        'retail_price' => (float) max(0, $vRetail),
                        'wholesale_price' => (float) max(0, $vWholesale),
                        'cost_price' => (float) max(0, $vCost),
                        'stock_quantity' => rand(0, 150),
                        'image' => $album[$idx % count($album)],
                        'album' => $album,
                        'attributes' => $attrsMap,
                    ];
                }
            }

            $warehouseStocks = [];
            if (count($warehouseIds)) {
                $warehouseStocks[] = [
                    'warehouse_id' => $warehouseIds[0],
                    'stock_quantity' => rand(0, 300),
                    'storage_location' => 'A-' . rand(1, 20) . '-' . rand(1, 50),
                ];
            }

            $tiers = [];
            if ($i % 2 === 0) {
                $tiers = [
                    ['min_quantity' => 2, 'max_quantity' => 9, 'price' => max(0, $wholesale - 5000)],
                    ['min_quantity' => 10, 'max_quantity' => null, 'price' => max(0, $wholesale - 15000)],
                ];
            }

            $tags = [
                'Demo',
                $hasVariants ? 'Variant' : 'Single',
                'Batch-' . ((int) floor($i / 10) + 1),
            ];

            $payload = [
                'name' => $name,
                'canonical' => $canonical,
                'description' => '<p>Mô tả demo cho ' . e($name) . '</p>',
                'content' => '<p>Nội dung demo cho ' . e($name) . '</p>',
                'product_catalogue_id' => count($catalogueIds) ? $catalogueIds[array_rand($catalogueIds)] : null,
                'product_brand_id' => count($brandIds) ? $brandIds[array_rand($brandIds)] : null,
                'sku' => "DEMO-{$i}",
                'barcode' => (string) rand(100000000000, 999999999999),
                'unit' => 'Cái',
                'retail_price' => $retail,
                'wholesale_price' => $wholesale,
                'cost_price' => $cost,
                'management_type' => $managementType,
                'pricing_tiers' => $tiers,
                'tags' => $tags,
                'album' => $album,
                'image' => $album[0],
                'track_inventory' => ($i % 5 !== 0) ? 1 : 0,
                'allow_negative_stock' => ($i % 7 === 0) ? 1 : 0,
                'warehouse_stocks' => $warehouseStocks,
                'attributes' => $attributes,
                'variants' => $variants,
                // ensure redirect flag does not matter in service layer
                'save_and_redirect' => '',
                // tax will be snapshotted from setting if apply_tax present
                'apply_tax' => ($i % 2 === 0) ? 1 : 0,
            ];

            try {
                $created = $productService->save(new Request($payload));

                // If management type is batch, create default batch + optionally some extra batches
                if ($created && $managementType === 'batch') {
                    $pid = (int) ($created->id ?? 0);
                    if ($pid > 0) {
                        // DEFAULT batch
                        ProductBatch::updateOrCreate(
                            ['product_id' => $pid, 'code' => 'DEFAULT'],
                            [
                                'is_default' => true,
                                'warehouse_id' => $warehouseIds[0] ?? null,
                                'stock_quantity' => rand(0, 50),
                                'status' => 'active',
                            ]
                        );

                        // Extra batches (best-effort)
                        if ($i % 3 === 0) {
                            for ($b = 1; $b <= rand(1, 3); $b++) {
                                ProductBatch::updateOrCreate(
                                    ['product_id' => $pid, 'code' => "BATCH-" . str_pad((string) $b, 2, '0', STR_PAD_LEFT)],
                                    [
                                        'is_default' => false,
                                        'warehouse_id' => $warehouseIds[0] ?? null,
                                        'stock_quantity' => rand(0, 80),
                                        'manufactured_at' => now()->subDays(rand(1, 180))->toDateString(),
                                        'expired_at' => now()->addDays(rand(30, 365))->toDateString(),
                                        'status' => 'active',
                                    ]
                                );
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                $this->command?->error("Failed seeding product #{$i}: " . $e->getMessage());
            }
        }

        $this->command?->info('Demo products seeded.');
    }
}
