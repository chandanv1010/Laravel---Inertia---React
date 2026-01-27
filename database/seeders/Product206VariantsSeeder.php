<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\AttributeCatalogue;
use App\Models\Attribute;
use App\Models\Language;
use Illuminate\Support\Facades\DB;

class Product206VariantsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::beginTransaction();
        
        try {
            // Clean up existing data for product 206 variants
            ProductVariant::where('product_id', 206)->delete();
            
            // Clean up old attribute catalogues if they exist
            AttributeCatalogue::whereIn('type', ['color', 'size'])->delete();
            
            // Get or create attribute catalogues
            $colorCatalogue = AttributeCatalogue::firstOrCreate(
                ['type' => 'color'],
                ['order' => 1, 'publish' => 2]
            );
            
            $sizeCatalogue = AttributeCatalogue::firstOrCreate(
                ['type' => 'size'],
                ['order' => 2, 'publish' => 2]
            );
            
            // Set display names for attribute catalogues
            $languageId = config('app.language_id', 1);
            if (!$colorCatalogue->languages()->where('language_id', $languageId)->exists()) {
                $colorCatalogue->languages()->attach($languageId, [
                    'name' => 'Màu sắc',
                    'description' => 'Màu sắc sản phẩm',
                    'canonical' => 'mau-sac-' . time(),
                ]);
            }
            
            if (!$sizeCatalogue->languages()->where('language_id', $languageId)->exists()) {
                $sizeCatalogue->languages()->attach($languageId, [
                    'name' => 'Kích thước',
                    'description' => 'Kích thước sản phẩm',
                    'canonical' => 'kich-thuoc-' . time(),
                ]);
            }
            
            // Create colors
            $colors = [
                ['value' => 'Đỏ', 'color_code' => '#ef4444', 'order' => 1],
                ['value' => 'Xanh', 'color_code' => '#3b82f6', 'order' => 2],
            ];
            
            $colorAttrs = [];
            foreach ($colors as $color) {
                $attr = Attribute::firstOrCreate(
                    [
                        'attribute_catalogue_id' => $colorCatalogue->id,
                        'value' => $color['value']
                    ],
                    [
                        'color_code' => $color['color_code'],
                        'order' => $color['order'],
                        'publish' => 2
                    ]
                );
                
                // Add language
                if (!$attr->languages()->where('language_id', $languageId)->exists()) {
                    $attr->languages()->attach($languageId, [
                        'name' => $color['value'],
                        'description' => 'Màu ' . $color['value'],
                    ]);
                }
                
                $colorAttrs[] = $attr;
            }
            
            // Create sizes
            $sizes = [
                ['value' => 'M', 'order' => 1],
                ['value' => 'L', 'order' => 2],
                ['value' => 'XL', 'order' => 3],
                ['value' => '2XL', 'order' => 4],
                ['value' => '3XL', 'order' => 5],
            ];
            
            $sizeAttrs = [];
            foreach ($sizes as $size) {
                $attr = Attribute::firstOrCreate(
                    [
                        'attribute_catalogue_id' => $sizeCatalogue->id,
                        'value' => $size['value']
                    ],
                    [
                        'order' => $size['order'],
                        'publish' => 2
                    ]
                );
                
                // Add language
                if (!$attr->languages()->where('language_id', $languageId)->exists()) {
                    $attr->languages()->attach($languageId, [
                        'name' => $size['value'],
                        'description' => 'Size ' . $size['value'],
                    ]);
                }
                
                $sizeAttrs[] = $attr;
            }
            
            $this->command->info('Created attributes: ' . count($colorAttrs) . ' colors, ' . count($sizeAttrs) . ' sizes');
            
            // Create variants for each color + size combination
            $variantCount = 0;
            foreach ($colorAttrs as $colorIndex => $colorAttr) {
                foreach ($sizeAttrs as $sizeIndex => $sizeAttr) {
                    // Some combinations will be out of stock
                    $stockQuantity = in_array($sizeAttr->value, ['M', '3XL']) ? 0 : rand(10, 50);
                    
                    $variant = ProductVariant::create([
                        'product_id' => 206,
                        'sku' => 'POLO-' . strtoupper($colorAttr->value) . '-' . $sizeAttr->value,
                        'retail_price' => 269000,
                        'wholesale_price' => 200000,
                        'cost_price' => 150000,
                        'stock_quantity' => $stockQuantity,
                        'management_type' => 'basic',
                        'track_inventory' => true,
                        'allow_negative_stock' => false,
                        'is_default' => ($colorIndex === 0 && $sizeIndex === 1), // Red + L is default
                        'publish' => 2,
                        'order' => ($colorIndex * count($sizeAttrs)) + $sizeIndex,
                    ]);
                    
                    // Attach attributes to variant
                    DB::table('product_variant_attributes')->insert([
                        [
                            'product_variant_id' => $variant->id,
                            'attribute_id' => $colorAttr->id,
                        ],
                        [
                            'product_variant_id' => $variant->id,
                            'attribute_id' => $sizeAttr->id,
                        ],
                    ]);
                    
                    $variantCount++;
                    $this->command->info("Created variant: {$variant->sku} (Stock: {$stockQuantity})");
                }
            }
            
            DB::commit();
            $this->command->info("✅ Successfully created {$variantCount} variants for product 206");
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Failed to seed variants: ' . $e->getMessage());
            throw $e;
        }
    }
}
