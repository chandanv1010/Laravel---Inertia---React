<?php

namespace Tests\Feature\Quote;

use App\Models\User;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuoteCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Create language with ID 1 as required by ProductFactory
        \App\Models\Language::factory()->create(['id' => 1]);
    }

    public function test_can_list_quotes()
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get(route('backend.quotes.index'));

        $response->assertStatus(200);
    }

    public function test_can_create_quote()
    {
        $user = User::factory()->create();
        $customer = Customer::factory()->create();
        $product = Product::factory()->create(['retail_price' => 100000]);

        $data = [
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'status' => 'draft',
            'items' => [
                [
                    'product_id' => $product->id,
                    'product_name' => 'Test Product',
                    'quantity' => 2,
                    'price' => 100000,
                    'discount' => 0,
                ]
            ],
            'tax_amount' => 0,
        ];

        $response = $this->actingAs($user)->post(route('backend.quotes.store'), $data);

        $response->assertRedirect(route('backend.quotes.index'));
        $this->assertDatabaseHas('quotes', ['customer_name' => $customer->name]);
    }

    public function test_can_export_pdf()
    {
        $user = User::factory()->create();
        $quote = Quote::factory()->create();

        $response = $this->actingAs($user)->get(route('backend.quotes.export.pdf', $quote->id));

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }
}
