<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductBatchWarehouse;
use App\Models\ProductWarehouseStock;
use App\Models\ProductVariant;
use App\Models\ProductVariantWarehouseStock;
use App\Models\Order;
use App\Models\Customer;
use App\Models\Warehouse;
use App\Pipelines\Checkout\Payloads\CheckoutPayload;
use App\Pipelines\Checkout\Pipes\ValidateStockPipe;
use App\Pipelines\Checkout\Pipes\DeductInventoryPipe;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class InventoryPipelineTest extends TestCase
{
    use DatabaseTransactions;

    protected $warehouse;
    protected $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->warehouse = Warehouse::first() ?? Warehouse::create(['name' => 'Test Warehouse']);
        $this->customer = Customer::first() ?? Customer::factory()->create();
    }

    /** @test */
    public function test_it_deducts_basic_product_stock_correctly()
    {
        // 1. Setup
        $product = Product::factory()->create([
            'management_type' => 'basic',
            'track_inventory' => true,
            'allow_negative_stock' => false
        ]);
        
        ProductWarehouseStock::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'stock_quantity' => 10
        ]);

        $payload = $this->createPayload([
            ['product_id' => $product->id, 'quantity' => 4, 'variant_id' => null]
        ]);

        // 2. Action
        $validate = new ValidateStockPipe();
        $deduct = new DeductInventoryPipe();

        $payload = $validate->handle($payload, fn($p) => $p);
        $payload = $deduct->handle($payload, fn($p) => $p);

        // 3. Assert
        $stock = ProductWarehouseStock::where('product_id', $product->id)->first();
        $this->assertEquals(6, $stock->stock_quantity);
    }

    /** @test */
    public function test_it_deducts_batch_product_stock_fifo()
    {
        // 1. Setup
        $product = Product::factory()->create([
            'management_type' => 'batch',
            'track_inventory' => true,
            'allow_negative_stock' => false
        ]);

        // Batch 1: Oldest
        $batch1 = ProductBatch::create([
            'product_id' => $product->id,
            'code' => 'B1',
            'manufactured_at' => now()->subDays(10)
        ]);
        ProductBatchWarehouse::create([
            'product_batch_id' => $batch1->id,
            'warehouse_id' => $this->warehouse->id,
            'stock_quantity' => 3
        ]);

        // Batch 2: Newer
        $batch2 = ProductBatch::create([
            'product_id' => $product->id,
            'code' => 'B2',
            'manufactured_at' => now()->subDays(5)
        ]);
        ProductBatchWarehouse::create([
            'product_batch_id' => $batch2->id,
            'warehouse_id' => $this->warehouse->id,
            'stock_quantity' => 10
        ]);

        // Đồng bộ warehouse stock (vì code Deduct giảm cả 2 bảng)
        ProductWarehouseStock::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'stock_quantity' => 13
        ]);

        $payload = $this->createPayload([
            ['product_id' => $product->id, 'quantity' => 5, 'variant_id' => null]
        ]);

        // 2. Action
        $validate = new ValidateStockPipe();
        $deduct = new DeductInventoryPipe();

        $payload = $validate->handle($payload, fn($p) => $p);
        $payload = $deduct->handle($payload, fn($p) => $p);

        // 3. Assert
        // Batch 1 nên còn 0
        $this->assertEquals(0, ProductBatchWarehouse::where('product_batch_id', $batch1->id)->first()->stock_quantity);
        // Batch 2 nên còn 10 - (5-3) = 8
        $this->assertEquals(8, ProductBatchWarehouse::where('product_batch_id', $batch2->id)->first()->stock_quantity);
        // Warehouse stock nên còn 13 - 5 = 8
        $this->assertEquals(8, ProductWarehouseStock::where('product_id', $product->id)->first()->stock_quantity);
    }

    /** @test */
    public function test_it_allows_negative_stock_when_enabled()
    {
        // 1. Setup
        $product = Product::factory()->create([
            'management_type' => 'basic',
            'track_inventory' => true,
            'allow_negative_stock' => true
        ]);
        
        ProductWarehouseStock::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'stock_quantity' => 2
        ]);

        $payload = $this->createPayload([
            ['product_id' => $product->id, 'quantity' => 5, 'variant_id' => null]
        ]);

        // 2. Action
        $validate = new ValidateStockPipe();
        $deduct = new DeductInventoryPipe();

        $payload = $validate->handle($payload, fn($p) => $p);
        $payload = $deduct->handle($payload, fn($p) => $p);

        // 3. Assert
        $stock = ProductWarehouseStock::where('product_id', $product->id)->first();
        $this->assertEquals(-3, $stock->stock_quantity);
    }

    /** @test */
    public function test_it_skips_deduction_when_track_inventory_is_off()
    {
        // 1. Setup
        $product = Product::factory()->create([
            'management_type' => 'basic',
            'track_inventory' => false,
            'allow_negative_stock' => false
        ]);
        
        ProductWarehouseStock::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'stock_quantity' => 10
        ]);

        $payload = $this->createPayload([
            ['product_id' => $product->id, 'quantity' => 5, 'variant_id' => null]
        ]);

        // 2. Action
        $validate = new ValidateStockPipe();
        $deduct = new DeductInventoryPipe();

        $payload = $validate->handle($payload, fn($p) => $p);
        $payload = $deduct->handle($payload, fn($p) => $p);

        // 3. Assert - Tồn kho không đổi
        $stock = ProductWarehouseStock::where('product_id', $product->id)->first();
        $this->assertEquals(10, $stock->stock_quantity);
    }

    /** @test */
    public function test_it_handles_variant_stock_deduction()
    {
        // 1. Setup
        $product = Product::factory()->create();
        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'VAR-001',
            'management_type' => 'basic',
            'track_inventory' => true
        ]);
        
        ProductVariantWarehouseStock::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $this->warehouse->id,
            'stock_quantity' => 10
        ]);

        $payload = $this->createPayload([
            ['product_id' => $product->id, 'quantity' => 3, 'variant_id' => $variant->id]
        ]);

        // 2. Action
        $validate = new ValidateStockPipe();
        $deduct = new DeductInventoryPipe();

        $payload = $validate->handle($payload, fn($p) => $p);
        $payload = $deduct->handle($payload, fn($p) => $p);

        // 3. Assert
        $stock = ProductVariantWarehouseStock::where('product_variant_id', $variant->id)->first();
        $this->assertEquals(7, $stock->stock_quantity);
    }

    protected function createPayload(array $items): CheckoutPayload
    {
        $payload = new CheckoutPayload();
        $payload->setData(['items' => $items], $this->customer, request());
        $payload->order = Order::factory()->create(['order_code' => 'TEST-' . uniqid()]);
        return $payload;
    }
}
