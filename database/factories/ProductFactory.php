<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'product_catalogue_id' => null,
            'product_brand_id' => null,
            'sku' => $this->faker->bothify('P-#####'),
            'barcode' => null,
            'unit' => 'pcs',
            'retail_price' => 0,
            'wholesale_price' => 0,
            'management_type' => 'basic',
            'track_inventory' => 1,
            'allow_negative_stock' => 0,
            'image' => null,
            'album' => [],
            'qrcode' => null,
            'order' => 0,
            'publish' => '2',
            'user_id' => \App\Models\User::factory(),
            'robots' => null,
            'auto_translate' => 0,
        ];
    }

    public function configure()
    {
        return $this->afterCreating(function (Product $product) {
            $languageId = 1; // Default
            // Ensure language exists or just attach if DB constraints allow (assuming language table seeded or ignoring FK if not strict, but usually strict).
            // Better to use Language factory if available? 
            // I'll assume Language ID 1 exists or I should create it.
            // For now, I'll direct insert to pivot to avoid factories complexity if LanguageFactory missing.
            // But pivot table requires language_id.
            
            \Illuminate\Support\Facades\DB::table('product_language')->insert([
                'product_id' => $product->id,
                'language_id' => $languageId, 
                'name' => fake()->name,
                'canonical' => fake()->slug,
                'meta_title' => '',
                'meta_keyword' => '',
                'meta_description' => '',
                'description' => '',
                'content' => '',
            ]);
        });
    }
}

