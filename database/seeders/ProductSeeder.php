<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\ProductBatch;
use App\Models\ProductWarehouseStock;
use App\Services\Interfaces\Product\ProductServiceInterface;

class ProductSeeder extends Seeder
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
            $this->command?->warn('No users found, skipping ProductSeeder.');
            return;
        }

        Auth::login($user);

        $catalogueIds = DB::table('product_catalogues')->pluck('id')->toArray();
        $brandIds = DB::table('product_brands')->pluck('id')->toArray();
        $warehouseIds = DB::table('warehouses')->pluck('id')->toArray();

        if (empty($catalogueIds)) {
            $this->command->warn('No product catalogues found. Please run ProductCatalogueSeeder first.');
            return;
        }

        if (empty($warehouseIds)) {
            $this->command->warn('No warehouses found. Please run WarehouseSeeder first.');
            return;
        }

        /** @var ProductServiceInterface $productService */
        $productService = app(ProductServiceInterface::class);

        $this->command?->info("Seeding 200 products with various cases...");

        // Case distribution:
        // 1-80: Basic products (no variant, no batch) - 40%
        // 81-140: Basic products with variants - 30%
        // 141-170: Batch products (no variant) - 15%
        // 171-190: Batch products with variants - 10%
        // 191-200: IMEI products - 5%

        for ($i = 1; $i <= 200; $i++) {
            $seed = (int) (microtime(true) * 1000) + $i;

            // Determine product type
            $managementType = 'basic';
            $hasVariants = false;
            $caseType = '';

            if ($i <= 80) {
                // Basic products (no variant, no batch)
                $managementType = 'basic';
                $hasVariants = false;
                $caseType = 'BASIC';
            } elseif ($i <= 140) {
                // Basic products with variants
                $managementType = 'basic';
                $hasVariants = true;
                $caseType = 'BASIC-VARIANT';
            } elseif ($i <= 170) {
                // Batch products (no variant)
                $managementType = 'batch';
                $hasVariants = false;
                $caseType = 'BATCH';
            } elseif ($i <= 190) {
                // Batch products with variants
                $managementType = 'batch';
                $hasVariants = true;
                $caseType = 'BATCH-VARIANT';
            } else {
                // IMEI products
                $managementType = 'imei';
                $hasVariants = false;
                $caseType = 'IMEI';
            }

            $variantMode = ($i % 3) + 1; // 1..3

            $name = sprintf('[%s] Sản phẩm %03d', $caseType, $i);
            $canonical = 'san-pham-' . Str::slug($caseType) . '-' . $i . '-' . $seed;

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
                        'sku' => "SP-{$i}-V" . str_pad((string) ($idx + 1), 3, '0', STR_PAD_LEFT),
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
            if (count($warehouseIds) && $managementType === 'basic') {
                // For basic products, add warehouse stocks
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
                'Seeder',
                $hasVariants ? 'Variant' : 'Single',
                $caseType,
            ];

            $payload = [
                'name' => $name,
                'canonical' => $canonical,
                'description' => '<p>Mô tả cho ' . e($name) . ' - Loại: ' . $caseType . '</p>',
                'content' => '<p>Nội dung chi tiết cho ' . e($name) . '</p>',
                'product_catalogue_id' => $catalogueIds[array_rand($catalogueIds)],
                'product_brand_id' => count($brandIds) ? $brandIds[array_rand($brandIds)] : null,
                'sku' => "SP-{$i}",
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
                'save_and_redirect' => '',
                'apply_tax' => ($i % 2 === 0) ? 1 : 0,
            ];

            try {
                $created = $productService->save(new Request($payload));

                // If management type is batch, create default batch + optionally some extra batches
                if ($created && $managementType === 'batch') {
                    $pid = (int) ($created->id ?? 0);
                    if ($pid > 0) {
                        // DEFAULT batch
                        $defaultBatch = ProductBatch::updateOrCreate(
                            ['product_id' => $pid, 'code' => 'DEFAULT'],
                            [
                                'is_default' => true,
                                'manufactured_at' => now()->subDays(rand(1, 30))->toDateString(),
                                'expired_at' => now()->addDays(rand(180, 365))->toDateString(),
                                'status' => 'active',
                            ]
                        );
                        
                        // Add stock to batch via product_batch_warehouses
                        if ($defaultBatch && !empty($warehouseIds)) {
                            DB::table('product_batch_warehouses')->insertOrIgnore([
                                'product_batch_id' => $defaultBatch->id,
                                'warehouse_id' => $warehouseIds[0],
                                'stock_quantity' => rand(10, 50),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }

                        // Extra batches (best-effort)
                        if ($i % 3 === 0) {
                            for ($b = 1; $b <= rand(1, 3); $b++) {
                                $batch = ProductBatch::updateOrCreate(
                                    ['product_id' => $pid, 'code' => "BATCH-" . str_pad((string) $b, 2, '0', STR_PAD_LEFT)],
                                    [
                                        'is_default' => false,
                                        'manufactured_at' => now()->subDays(rand(1, 180))->toDateString(),
                                        'expired_at' => now()->addDays(rand(30, 365))->toDateString(),
                                        'status' => 'active',
                                    ]
                                );
                                
                                // Add stock to batch via product_batch_warehouses
                                if ($batch && !empty($warehouseIds)) {
                                    DB::table('product_batch_warehouses')->insertOrIgnore([
                                        'product_batch_id' => $batch->id,
                                        'warehouse_id' => $warehouseIds[0],
                                        'stock_quantity' => rand(10, 80),
                                        'created_at' => now(),
                                        'updated_at' => now(),
                                    ]);
                                }
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                $this->command?->error("Failed seeding product #{$i}: " . $e->getMessage());
            }
        }

        $this->command?->info('✅ Products seeded successfully!');
        $this->command->info('📊 Distribution:');
        $this->command->info('   - BASIC (1-80): 40%');
        $this->command->info('   - BASIC-VARIANT (81-140): 30%');
        $this->command->info('   - BATCH (141-170): 15%');
        $this->command->info('   - BATCH-VARIANT (171-190): 10%');
        $this->command->info('   - IMEI (191-200): 5%');
    }
}
