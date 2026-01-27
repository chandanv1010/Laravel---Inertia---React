<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * UpdateProductImagesSeeder
 * 
 * Redistributes local product images from /userfiles/image/product/
 * to existing products in the database, replacing external picsum.photos URLs.
 */
class UpdateProductImagesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Available local images (from public/userfiles/image/product)
        $images = [
            '/userfiles/image/product/product-img3.png',
            '/userfiles/image/product/product-img7.png',
            '/userfiles/image/product/product-img8.png',
            '/userfiles/image/product/product-img9.png',
            '/userfiles/image/product/product-img10.png',
            '/userfiles/image/product/product-img11.png',
            '/userfiles/image/product/product-img12.png',
            '/userfiles/image/product/product-img13.png',
            '/userfiles/image/product/product-img14.png',
            '/userfiles/image/product/product-img15.png',
            '/userfiles/image/product/product-img16.png',
            '/userfiles/image/product/product-img17.png',
            '/userfiles/image/product/product-img18.png',
            '/userfiles/image/product/product-img26.png',
            '/userfiles/image/product/product-img27.png',
            '/userfiles/image/product/product-img28.png',
            '/userfiles/image/product/product-img29.png',
            '/userfiles/image/product/product-img30.png',
        ];

        $totalImages = count($images);
        
        // Get all products
        $products = DB::table('products')->orderBy('id')->get();
        
        if ($products->isEmpty()) {
            $this->command->warn('No products found. Please run ProductSeeder first.');
            return;
        }

        $this->command->info("Updating {$products->count()} products with local images...");

        $updated = 0;
        foreach ($products as $index => $product) {
            // Distribute images evenly across products
            $imageIndex = $index % $totalImages;
            $mainImage = $images[$imageIndex];
            
            // Create album with 3 different images
            $album = [
                $images[$imageIndex],
                $images[($imageIndex + 1) % $totalImages],
                $images[($imageIndex + 2) % $totalImages],
            ];

            // Update product
            DB::table('products')
                ->where('id', $product->id)
                ->update([
                    'image' => $mainImage,
                    'album' => json_encode($album),
                    'updated_at' => now(),
                ]);

            $updated++;
        }

        // Also update product variants if they exist
        $variants = DB::table('product_variants')->get();
        foreach ($variants as $index => $variant) {
            $imageIndex = $index % $totalImages;
            $mainImage = $images[$imageIndex];
            
            $album = [
                $images[$imageIndex],
                $images[($imageIndex + 1) % $totalImages],
                $images[($imageIndex + 2) % $totalImages],
            ];

            DB::table('product_variants')
                ->where('id', $variant->id)
                ->update([
                    'image' => $mainImage,
                    'album' => json_encode($album),
                    'updated_at' => now(),
                ]);
        }

        $this->command->info("✅ Updated {$updated} products with local images!");
        $this->command->info("✅ Updated {$variants->count()} product variants!");
    }
}
