<?php

namespace Tests\Feature\Product;

use App\Models\User;
use App\Models\Product;
use App\Models\Language;
use App\Models\ProductCatalogue;
use App\Models\ProductBrand;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class ProductStoreFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Avoid middleware mutating locale/language_id during tests
        $this->withoutMiddleware();
        // disable tracking/log writes in tests to avoid extra dependencies
        Config::set('tracking.enabled', false);
        // ensure app.language_id exists for attribute/language pivots
        Config::set('app.language_id', 1);

        // bypass module authorization in controllers
        Gate::shouldReceive('authorize')->andReturnTrue();
    }

    public function test_store_product_persists_all_related_data_from_ui_payload(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // minimal language required by multi-language pivots
        Language::factory()->create([
            'id' => 1,
            'canonical' => 'vi',
            'name' => 'Vietnamese',
            'publish' => '2',
            'user_id' => $user->id,
            'image' => '/userfiles/image/languages/Flag_of_Vietnam_svg.png',
            'description' => '',
        ]);

        $catalogue = ProductCatalogue::factory()->create(['user_id' => $user->id]);
        // create catalogue language pivot (required for dropdown/name usage)
        $catalogue->languages()->syncWithoutDetaching([
            1 => ['name' => 'Danh mục test', 'description' => null, 'canonical' => 'danh-muc-test', 'meta_title' => null, 'meta_keyword' => null, 'meta_description' => null, 'auto_translate' => 0]
        ]);

        $brand = ProductBrand::factory()->create(['user_id' => $user->id]);

        $payload = [
            'name' => 'Áo thun test',
            'canonical' => 'ao-thun-test',
            'product_catalogue_id' => $catalogue->id,
            'product_catalogues' => [(string) $catalogue->id],
            'product_brand_id' => $brand->id,
            'sku' => 'P-TEST-001',
            'barcode' => 'BAR-001',
            'unit' => 'cái',
            'publish' => '2',
            'order' => 0,
            'robots' => 'index',
            'track_inventory' => 'on',
            'allow_negative_stock' => 'on',
            'retail_price' => 1200000,
            'wholesale_price' => 1100000,
            'cost_price' => 500000,
            'pricing_tiers' => [
                ['min_quantity' => 2, 'max_quantity' => 10, 'price' => 1000000],
                ['min_quantity' => 11, 'max_quantity' => null, 'price' => 900000],
            ],
            'tags' => ['Tag A', 'Tag B'],
            'album' => ['/a.png', '/b.png'],
            'image' => '/a.png',
            'attributes' => [
                ['name' => 'Màu', 'values' => ['Đỏ', 'Vàng']],
                ['name' => 'Size', 'values' => ['M']],
            ],
            'variants' => [
                [
                    'sku' => 'P-TEST-001-DO-M',
                    'retail_price' => 1200000,
                    'wholesale_price' => 1100000,
                    'cost_price' => 600000,
                    'stock_quantity' => 5,
                    'image' => '/v1.png',
                    'album' => ['/v1.png', '/v1-2.png'],
                    'barcode' => 'VBAR-1',
                    'attributes' => ['Màu' => 'Đỏ', 'Size' => 'M'],
                ],
            ],
        ];

        $resp = $this->post('/backend/product', $payload);
        $resp->assertStatus(302);
        $resp->assertSessionHasNoErrors();
        $resp->assertSessionMissing('error');

        $product = Product::query()->where('sku', 'P-TEST-001')->firstOrFail();

        // products table
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'product_catalogue_id' => $catalogue->id,
            'product_brand_id' => $brand->id,
            'track_inventory' => 1,
            'allow_negative_stock' => 1,
        ]);

        // product_language pivot
        $this->assertDatabaseHas('product_language', [
            'product_id' => $product->id,
            'language_id' => 1,
            'name' => 'Áo thun test',
            'canonical' => 'ao-thun-test',
        ]);

        // product_catalogue_product pivot
        $this->assertDatabaseHas('product_catalogue_product', [
            'product_id' => $product->id,
            'product_catalogue_id' => $catalogue->id,
        ]);

        // pricing_tiers table
        $this->assertDatabaseHas('pricing_tiers', [
            'product_id' => $product->id,
            'min_quantity' => 2,
            'max_quantity' => 10,
        ]);

        // tags + taggables pivot
        $this->assertDatabaseHas('tags', ['type' => 'product', 'slug' => 'tag-a']);
        $this->assertDatabaseHas('tags', ['type' => 'product', 'slug' => 'tag-b']);
        $this->assertDatabaseHas('taggables', [
            'taggable_id' => $product->id,
            'taggable_type' => Product::class,
        ]);

        // variants table
        $this->assertDatabaseHas('product_variants', [
            'product_id' => $product->id,
            'sku' => 'P-TEST-001-DO-M',
            'barcode' => 'VBAR-1',
        ]);

        // attributes + pivot product_variant_attributes
        $variantId = DB::table('product_variants')->where('product_id', $product->id)->value('id');
        $this->assertNotNull($variantId);
        $this->assertDatabaseHas('product_variant_attributes', [
            'product_variant_id' => $variantId,
        ]);
    }
}

