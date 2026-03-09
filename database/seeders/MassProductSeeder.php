<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductBatchWarehouse;
use App\Services\Interfaces\Product\ProductServiceInterface;

class MassProductSeeder extends Seeder
{
    private array $productImages = [];
    private array $fashionImages = [];
    private array $warehouseIds = [];
    private array $catalogueIds = [];
    private int $productIndex = 0;

    public function run(): void
    {
        $user = User::where('email', env('GRANT_PERMS_EMAIL', 'chandanv1010@gmail.com'))->first()
            ?: User::first();
        if (!$user) {
            $this->command?->warn('No users found.');
            return;
        }
        Auth::login($user);

        // --- Phase 1: Remove demo products ---
        $this->removeDemoProducts();

        // --- Phase 2: Seed products ---
        $this->warehouseIds = DB::table('warehouses')->pluck('id')->toArray();
        $this->catalogueIds = DB::table('product_catalogues')->where('level', 2)->pluck('id')->toArray();
        $this->loadImages();

        $namesData = require __DIR__ . '/product_names_data.php';
        $productService = app(ProductServiceInterface::class);

        // Flatten all names with their catalogue
        $allProducts = [];
        foreach ($namesData as $catId => $names) {
            foreach ($names as $name) {
                $allProducts[] = ['catalogue_id' => $catId, 'name' => $name];
            }
        }

        // We have ~300 names. Duplicate some to reach 400.
        $extra = [];
        $needed = 400 - count($allProducts);
        for ($i = 0; $i < $needed; $i++) {
            $src = $allProducts[$i % count($allProducts)];
            $extra[] = [
                'catalogue_id' => $src['catalogue_id'],
                'name' => $src['name'] . ' V' . ($i + 2),
            ];
        }
        $allProducts = array_merge($allProducts, $extra);
        shuffle($allProducts);

        $this->command?->info("Seeding " . count($allProducts) . " products...");
        $bar = $this->command?->getOutput()->createProgressBar(count($allProducts));

        foreach ($allProducts as $idx => $item) {
            $this->productIndex = $idx;
            try {
                $this->seedOneProduct($productService, $item, $idx);
            } catch (\Throwable $e) {
                $this->command?->error("Failed #{$idx}: " . $e->getMessage());
            }
            $bar?->advance();
        }

        $bar?->finish();
        $this->command?->newLine();
        $this->command?->info('Done! Seeded ' . count($allProducts) . ' products.');
    }

    private function removeDemoProducts(): void
    {
        $this->command?->info('Removing existing demo products...');

        $existingIds = DB::table('products')->pluck('id')->toArray();
        if (empty($existingIds)) {
            $this->command?->info('No products to remove.');
            return;
        }

        // Get variant IDs for these products
        $variantIds = DB::table('product_variants')
            ->whereIn('product_id', $existingIds)
            ->pluck('id')->toArray();

        // Delete in order to respect FK constraints
        if (!empty($variantIds)) {
            DB::table('product_variant_warehouse_stocks')->whereIn('product_variant_id', $variantIds)->delete();
            DB::table('product_variant_warehouse_stock_logs')->whereIn('product_variant_id', $variantIds)->delete();
            DB::table('product_variant_attributes')->whereIn('product_variant_id', $variantIds)->delete();
        }

        // Batch-related
        $batchIds = DB::table('product_batches')->whereIn('product_id', $existingIds)->pluck('id')->toArray();
        if (!empty($batchIds)) {
            DB::table('product_batch_warehouses')->whereIn('product_batch_id', $batchIds)->delete();
            DB::table('product_batch_stock_logs')->whereIn('product_batch_id', $batchIds)->delete();
            DB::table('product_batches')->whereIn('id', $batchIds)->delete();
        }

        DB::table('product_warehouse_stocks')->whereIn('product_id', $existingIds)->delete();
        DB::table('product_warehouse_stock_logs')->whereIn('product_id', $existingIds)->delete();
        DB::table('product_variants')->whereIn('product_id', $existingIds)->delete();
        DB::table('pricing_tiers')->whereIn('product_id', $existingIds)->delete();
        DB::table('product_language')->whereIn('product_id', $existingIds)->delete();
        DB::table('product_catalogue_product')->whereIn('product_id', $existingIds)->delete();
        DB::table('routers')->where('routerable_type', 'App\\Models\\Product')
            ->whereIn('routerable_id', $existingIds)->delete();
        DB::table('taggables')->where('taggable_type', 'App\\Models\\Product')
            ->whereIn('taggable_id', $existingIds)->delete();

        // Finally delete products (soft-delete bypass)
        DB::table('products')->whereIn('id', $existingIds)->delete();

        $this->command?->info('Removed ' . count($existingIds) . ' demo products.');
    }

    private function loadImages(): void
    {
        // Store URLs with leading slash so they work correctly as absolute paths
        $fashionPath = 'userfiles/image/product/thoi-trang-nam/';
        $files = glob(public_path($fashionPath) . '*.avif');
        foreach ($files as $f) {
            $this->fashionImages[] = '/' . $fashionPath . basename($f);
        }
    }

    private function getImageForProduct(int $catId, int $idx): string
    {
        if (!empty($this->fashionImages)) {
            return $this->fashionImages[$idx % count($this->fashionImages)];
        }
        return '';
    }

    private function getAlbumForProduct(int $catId, int $idx): array
    {
        if (empty($this->fashionImages)) return [];
        $images = $this->fashionImages;
        $count = count($images);
        $album = [];
        $start = $idx % $count;
        for ($i = 0; $i < min(8, $count); $i++) {
            $album[] = $images[($start + $i) % $count];
        }
        return $album;
    }

    private function seedOneProduct(ProductServiceInterface $service, array $item, int $idx): void
    {
        $catId = $item['catalogue_id'];
        $name = $item['name'];
        $canonical = Str::slug($name) . '-' . ($idx + 1);

        // Determine product type based on index distribution
        $bucket = $idx % 20;
        $managementType = 'basic';
        $hasVariants = false;

        if ($bucket < 6) {          // ~30% basic, no variants
            $managementType = 'basic';
        } elseif ($bucket < 10) {   // ~20% basic with batch
            $managementType = 'batch';
        } elseif ($bucket < 16) {   // ~30% basic with variants
            $managementType = 'basic';
            $hasVariants = true;
        } else {                    // ~20% variant with batch
            $managementType = 'batch';
            $hasVariants = true;
        }

        // Inventory settings - varied
        $trackInventory = ($idx % 5 !== 0) ? 1 : 0;  // 80% track inventory
        $allowNegativeStock = ($idx % 7 === 0) ? 1 : 0;  // ~14% allow negative

        // Pricing
        $retailPrice = (float)(rand(30, 2000) * 1000);
        $hasWholesale = ($idx % 3 === 0); // ~33% have wholesale
        $wholesalePrice = $hasWholesale ? (float)(max(10000, $retailPrice - rand(10, 200) * 1000)) : null;

        // Image & Album
        $image = $this->getImageForProduct($catId, $idx);
        $album = $this->getAlbumForProduct($catId, $idx);

        // Additional catalogues (some products belong to multiple categories)
        $productCatalogues = [$catId];
        if ($idx % 10 === 0 && count($this->catalogueIds) > 1) {
            $otherCat = $this->catalogueIds[array_rand($this->catalogueIds)];
            if ($otherCat !== $catId) {
                $productCatalogues[] = $otherCat;
            }
        }

        // SKU
        $sku = 'SP-' . strtoupper(Str::random(3)) . '-' . str_pad((string)($idx + 1), 4, '0', STR_PAD_LEFT);

        // Build variants if needed
        $variants = [];
        $isFashion = in_array($catId, [2, 6, 11, 18]); // fashion categories

        if ($hasVariants) {
            $variants = $this->buildVariants($idx, $catId, $isFashion, $retailPrice, $wholesalePrice, $managementType, $trackInventory, $allowNegativeStock);
        }

        // Warehouse stocks (only for tracked products without variants)
        $warehouseStocks = [];
        if ($trackInventory && !$hasVariants && !empty($this->warehouseIds)) {
            $numWarehouses = rand(1, min(3, count($this->warehouseIds)));
            for ($w = 0; $w < $numWarehouses; $w++) {
                $warehouseStocks[] = [
                    'warehouse_id' => $this->warehouseIds[$w],
                    'stock_quantity' => rand(5, 500),
                    'storage_location' => chr(65 + rand(0, 4)) . '-' . rand(1, 20) . '-' . rand(1, 50),
                ];
            }
        }

        // Pricing tiers (wholesale pricing)
        $tiers = [];
        if ($hasWholesale && $wholesalePrice) {
            $tiers = [
                ['min_quantity' => 5, 'max_quantity' => 19, 'price' => max(10000, $wholesalePrice)],
                ['min_quantity' => 20, 'max_quantity' => 49, 'price' => max(10000, $wholesalePrice - 10000)],
                ['min_quantity' => 50, 'max_quantity' => null, 'price' => max(10000, $wholesalePrice - 30000)],
            ];
        }

        $payload = [
            'name' => $name,
            'canonical' => $canonical,
            'description' => '<p>' . $name . ' - Sản phẩm chất lượng cao, giá tốt nhất thị trường.</p>',
            'content' => '<h3>Thông tin sản phẩm</h3><p>' . $name . ' được thiết kế với chất lượng cao cấp, phù hợp cho mọi nhu cầu sử dụng. Sản phẩm đảm bảo chính hãng 100%, được kiểm tra kỹ lưỡng trước khi giao đến tay khách hàng.</p><h3>Đặc điểm nổi bật</h3><ul><li>Chất liệu cao cấp, bền đẹp</li><li>Thiết kế hiện đại, tinh tế</li><li>Bảo hành chính hãng</li></ul>',
            'product_catalogue_id' => $catId,
            'product_catalogues' => $productCatalogues,
            'sku' => $sku,
            'barcode' => (string)rand(1000000000000, 9999999999999),
            'unit' => $this->getUnit($catId),
            'retail_price' => $retailPrice,
            'wholesale_price' => $wholesalePrice ?? 0,
            'management_type' => $managementType,
            'track_inventory' => $trackInventory,
            'allow_negative_stock' => $allowNegativeStock,
            'image' => $image,
            'album' => $album,
            'warehouse_stocks' => $warehouseStocks,
            'variants' => $variants,
            'pricing_tiers' => $tiers,
            'tags' => $this->getTags($managementType, $hasVariants, $catId),
            'publish' => 1,
            'apply_tax' => ($idx % 4 === 0) ? 1 : 0,
            'save_and_redirect' => '',
        ];

        $created = $service->save(new Request($payload));

        // Create batches for batch management type
        if ($created && $managementType === 'batch') {
            $pid = (int)($created->id ?? 0);
            if ($pid > 0) {
                $this->createBatches($pid, $hasVariants, $created);
            }
        }
    }

    private function buildVariants(int $idx, int $catId, bool $isFashion, float $retailPrice, ?float $wholesalePrice, string $mgmtType, int $trackInv, int $allowNeg): array
    {
        $numAttrGroups = ($idx % 3 === 0) ? 3 : 2; // 33% have 3 groups, 67% have 2

        $colors = ['Đen', 'Trắng', 'Xanh Navy', 'Đỏ', 'Xám', 'Be', 'Nâu', 'Xanh Rêu', 'Hồng', 'Vàng'];
        $sizes = ['S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
        $materials = ['Cotton', 'Polyester', 'Lụa', 'Len', 'Vải Thun', 'Kaki', 'Jean', 'Nỉ'];

        // Pick random subsets
        $numColors = rand(2, 4);
        $numSizes = rand(2, 4);
        $numMaterials = rand(2, 3);

        shuffle($colors);
        shuffle($sizes);
        shuffle($materials);
        $selectedColors = array_slice($colors, 0, $numColors);
        $selectedSizes = array_slice($sizes, 0, $numSizes);
        $selectedMaterials = array_slice($materials, 0, $numMaterials);

        // Build attribute groups
        $attrGroups = [];
        if ($isFashion) {
            $attrGroups['Màu'] = $selectedColors;
            $attrGroups['Size'] = $selectedSizes;
            if ($numAttrGroups >= 3) {
                $attrGroups['Chất liệu'] = $selectedMaterials;
            }
        } else {
            // Non-fashion: use Màu + Kích thước or Chất liệu
            $attrGroups['Màu'] = $selectedColors;
            if ($numAttrGroups >= 3) {
                $attrGroups['Kích thước'] = $selectedSizes;
                $attrGroups['Chất liệu'] = $selectedMaterials;
            } else {
                $attrGroups['Kích thước'] = $selectedSizes;
            }
        }

        // Generate combinations
        $combos = [[]];
        foreach ($attrGroups as $groupName => $values) {
            $next = [];
            foreach ($combos as $combo) {
                foreach ($values as $val) {
                    $c = $combo;
                    $c[$groupName] = $val;
                    $next[] = $c;
                }
            }
            $combos = $next;
        }

        // Limit combos to max 12 to avoid explosion
        if (count($combos) > 12) {
            $combos = array_slice($combos, 0, 12);
        }

        $variants = [];
        $images = $this->fashionImages;

        foreach ($combos as $vIdx => $attrsMap) {
            $vRetail = $retailPrice + rand(-20, 50) * 1000;
            $vWholesale = $wholesalePrice ? ($wholesalePrice + rand(-10, 20) * 1000) : null;

            $vImage = '';
            $vAlbum = [];
            if (!empty($images)) {
                $vImage = $images[($idx + $vIdx) % count($images)];
                $start = ($idx + $vIdx) % count($images);
                for ($i = 0; $i < min(3, count($images)); $i++) {
                    $vAlbum[] = $images[($start + $i) % count($images)];
                }
            }

            $variantTrack = ($vIdx % 4 !== 0) ? true : false; // 75% of variants track inventory
            $variantAllowNeg = ($vIdx % 5 === 0) ? true : false;

            $variants[] = [
                'id' => 'new-' . $idx . '-' . $vIdx,
                'sku' => 'SP-' . strtoupper(Str::random(2)) . '-' . ($idx + 1) . '-V' . str_pad((string)($vIdx + 1), 2, '0', STR_PAD_LEFT),
                'barcode' => (string)rand(1000000000000, 9999999999999),
                'retail_price' => (float)max(10000, $vRetail),
                'wholesale_price' => $vWholesale ? (float)max(10000, $vWholesale) : null,
                'cost_price' => (float)max(5000, $vRetail * 0.6),
                'stock_quantity' => $variantTrack ? rand(5, 200) : 0,
                'image' => $vImage,
                'album' => $vAlbum,
                'attributes' => $attrsMap,
                'is_default' => ($vIdx === 0),
                'management_type' => $mgmtType,
                'track_inventory' => $variantTrack,
                'allow_negative_stock' => $variantAllowNeg,
            ];
        }

        return $variants;
    }

    private function createBatches(int $productId, bool $hasVariants, $product): void
    {
        if ($hasVariants) {
            // Create batches for each variant
            $variants = DB::table('product_variants')->where('product_id', $productId)->get();
            foreach ($variants as $variant) {
                $defaultBatch = ProductBatch::updateOrCreate(
                    ['product_id' => $productId, 'product_variant_id' => $variant->id, 'code' => 'DEFAULT'],
                    ['is_default' => true, 'status' => 'active']
                );
                // Add warehouse stock for the batch
                if (!empty($this->warehouseIds)) {
                    ProductBatchWarehouse::updateOrCreate(
                        ['product_batch_id' => $defaultBatch->id, 'warehouse_id' => $this->warehouseIds[0]],
                        ['stock_quantity' => rand(5, 100)]
                    );
                }

                // Extra batch for some variants
                if ($variant->id % 3 === 0) {
                    $extraBatch = ProductBatch::updateOrCreate(
                        ['product_id' => $productId, 'product_variant_id' => $variant->id, 'code' => 'BATCH-01'],
                        [
                            'is_default' => false,
                            'manufactured_at' => now()->subDays(rand(10, 90))->toDateString(),
                            'expired_at' => now()->addDays(rand(60, 365))->toDateString(),
                            'status' => 'active',
                        ]
                    );
                    if (!empty($this->warehouseIds)) {
                        ProductBatchWarehouse::updateOrCreate(
                            ['product_batch_id' => $extraBatch->id, 'warehouse_id' => $this->warehouseIds[0]],
                            ['stock_quantity' => rand(5, 50)]
                        );
                    }
                }
            }
        } else {
            // Non-variant batch product
            $defaultBatch = ProductBatch::updateOrCreate(
                ['product_id' => $productId, 'code' => 'DEFAULT'],
                ['is_default' => true, 'status' => 'active']
            );
            if (!empty($this->warehouseIds)) {
                $numWh = rand(1, min(2, count($this->warehouseIds)));
                for ($w = 0; $w < $numWh; $w++) {
                    ProductBatchWarehouse::updateOrCreate(
                        ['product_batch_id' => $defaultBatch->id, 'warehouse_id' => $this->warehouseIds[$w]],
                        ['stock_quantity' => rand(10, 200)]
                    );
                }
            }

            // Extra batches
            $extraCount = rand(1, 3);
            for ($b = 1; $b <= $extraCount; $b++) {
                $extraBatch = ProductBatch::updateOrCreate(
                    ['product_id' => $productId, 'code' => 'BATCH-' . str_pad((string)$b, 2, '0', STR_PAD_LEFT)],
                    [
                        'is_default' => false,
                        'manufactured_at' => now()->subDays(rand(10, 180))->toDateString(),
                        'expired_at' => now()->addDays(rand(30, 365))->toDateString(),
                        'status' => 'active',
                    ]
                );
                if (!empty($this->warehouseIds)) {
                    ProductBatchWarehouse::updateOrCreate(
                        ['product_batch_id' => $extraBatch->id, 'warehouse_id' => $this->warehouseIds[0]],
                        ['stock_quantity' => rand(5, 80)]
                    );
                }
            }
        }
    }

    private function getUnit(int $catId): string
    {
        return match ($catId) {
            2, 6 => 'Cái',
            3, 4, 5 => 'Chiếc',
            7 => 'Hộp',
            8 => 'Bộ',
            9, 10 => 'Hộp',
            11, 18 => 'Đôi',
            12 => 'Cái',
            14 => 'Gói',
            17 => 'Chiếc',
            19 => 'Cái',
            20 => 'Cái',
            21 => 'Cái',
            default => 'Cái',
        };
    }

    private function getTags(string $mgmtType, bool $hasVariants, int $catId): array
    {
        $tags = [];
        $tags[] = $hasVariants ? 'Có phiên bản' : 'Đơn giản';
        $tags[] = match ($mgmtType) {
            'batch' => 'Quản lý lô',
            'imei' => 'IMEI',
            default => 'Cơ bản',
        };

        $catNames = [
            2 => 'Thời trang',
            6 => 'Thời trang',
            11 => 'Giày dép',
            18 => 'Giày dép',
            3 => 'Phụ kiện',
            4 => 'Điện tử',
            5 => 'Laptop',
            7 => 'Mẹ bé',
            8 => 'Gia dụng',
            9 => 'Làm đẹp',
            10 => 'Sức khỏe',
            12 => 'Túi ví',
            14 => 'Bách hóa',
            17 => 'Đồng hồ',
            19 => 'Điện máy',
            20 => 'Thể thao',
            21 => 'Xe cộ',
        ];
        if (isset($catNames[$catId])) $tags[] = $catNames[$catId];

        return $tags;
    }
}
