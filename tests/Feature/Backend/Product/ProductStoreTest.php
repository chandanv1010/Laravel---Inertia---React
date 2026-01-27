<?php

namespace Tests\Feature\Backend\Product;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ProductStoreTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed database if necessary for catalogues/brands
        $this->seed(); 
        $this->actingAs(User::factory()->create());
    }

    /** @test */
    public function it_requires_product_name()
    {
        $response = $this->post(route('product.store'), [
            'sku' => 'TEST-SKU',
            'retail_price' => 100000,
        ]);

        $response->assertSessionHasErrors('name');
    }

    /** @test */
    public function it_requires_sku()
    {
        $response = $this->post(route('product.store'), [
            'name' => 'Test Product',
            'retail_price' => 100000,
        ]);

        $response->assertSessionHasErrors('sku');
    }

    /** @test */
    public function it_requires_retail_price()
    {
        $response = $this->post(route('product.store'), [
            'name' => 'Test Product',
            'sku' => 'TEST-SKU',
        ]);

        $response->assertSessionHasErrors('retail_price');
    }

    /** @test */
    public function it_can_create_product_successfully()
    {
        // Mocking minimal requirement
        $data = [
            'name' => 'Valid Product',
            'description' => 'Test Description',
            'sku' => 'VALID-SKU-01',
            'retail_price' => 500000,
            'product_catalogue_id' => 1, // Assuming seeder created this
            'product_brand_id' => 1, // Assuming seeder created this
            'save_and_redirect' => 'redirect'
        ];

        $response = $this->post(route('product.store'), $data);

        $response->assertRedirect();
        $this->assertDatabaseHas('products', [
            'name' => 'Valid Product',
            'sku' => 'VALID-SKU-01'
        ]);
    }
}
