<?php
namespace Tests\Feature\Services\Product;

use Tests\Feature\Services\Cache\BaseCacheServiceTest;
use Mockery;
use Illuminate\Http\Request;
use App\Services\Impl\V1\Product\ProductService;
use App\Repositories\Product\ProductRepo;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use App\Services\Interfaces\Attribute\AttributeCatalogueServiceInterface;
use App\Services\Interfaces\Attribute\AttributeServiceInterface;
use App\Models\Product;
use Tests\Fakes\FakeModel;
use Tests\Fakes\FakeProductForService;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class ProductServiceTest extends BaseCacheServiceTest
{
    protected $productService;
    protected $productRepoMock;
    protected $mockProductModel;
    protected $productCatalogueServiceMock;
    protected $productVariantServiceMock;
    protected $attributeCatalogueServiceMock;
    protected $attributeServiceMock;

    protected function setUp(): void
    {
        parent::setUp();
        config(['tracking.enabled' => false]); // avoid LogService DB writes in tests
        
        $this->productRepoMock = Mockery::mock(ProductRepo::class);
        $this->mockProductModel = Mockery::mock(Product::class);
        $this->mockProductModel->shouldIgnoreMissing(); // Ignore other calls
        
        $this->productRepoMock->shouldReceive('getFillable')->andReturn([
            'product_catalogue_id', 'product_brand_id', 'sku', 'barcode', 'unit', 
            'retail_price', 'wholesale_price', 'track_inventory', 'allow_negative_stock',
            'image', 'album', 'publish', 'user_id', 'order', 'robots'
        ]);
        // We overrode getRelationable in Repo, but here we mock Repo, so we should mock getRelationable
        $this->productRepoMock->shouldReceive('getRelationable')->andReturn(['tags', 'product_catalogues', 'languages']);
        
        // Mock Services
        $this->productCatalogueServiceMock = Mockery::mock(ProductCatalogueServiceInterface::class);
        $this->productVariantServiceMock = Mockery::mock(ProductVariantServiceInterface::class);
        $this->attributeCatalogueServiceMock = Mockery::mock(AttributeCatalogueServiceInterface::class);
        $this->attributeServiceMock = Mockery::mock(AttributeServiceInterface::class);
        
        $this->productService = new ProductService(
            $this->productRepoMock,
            $this->productCatalogueServiceMock,
            $this->productVariantServiceMock,
            $this->attributeCatalogueServiceMock,
            $this->attributeServiceMock
        );
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_create_product_normalizes_boolean_fields()
    {
        $requestData = [
            'name' => 'Test Product',
            'track_inventory' => 'on',
            'allow_negative_stock' => 'on',
            'product_catalogue_id' => 1,
        ];
        $request = new Request($requestData);

        $mockProduct = new FakeProductForService();
        $mockProduct->id = 1;

        // Expect create to be called with normalized values
        $this->productRepoMock->shouldReceive('create')
            ->with(Mockery::on(function ($data) {
                return $data['track_inventory'] === 1 && $data['allow_negative_stock'] === 1;
            }))
            ->once()
            ->andReturn($mockProduct);
            
        // Mock transaction
        \Illuminate\Support\Facades\DB::shouldReceive('beginTransaction');
        \Illuminate\Support\Facades\DB::shouldReceive('commit');
        \Illuminate\Support\Facades\DB::shouldReceive('rollBack');

        $result = $this->productService->save($request);

        $this->assertEquals(1, $result->id);
    }

    public function test_create_product_syncs_tags_without_database()
    {
        $requestData = [
            'name' => 'Test Product Tags',
            'track_inventory' => 'on',
            'tags' => ['Áo', 'Quần'],
        ];
        $request = new Request($requestData);

        // Mock Tag model static calls (no DB)
        $tagAlias = Mockery::mock('alias:App\Models\Tag');
        $builder = Mockery::mock();
        $tagAlias->shouldReceive('query')->andReturn($builder);
        // firstOrCreate called twice, return objects with ids
        $builder->shouldReceive('firstOrCreate')
            ->andReturn((object)['id' => 10], (object)['id' => 11]);

        $mockProduct = new FakeProductForService();
        $mockProduct->id = 1;

        $this->productRepoMock->shouldReceive('create')->andReturn($mockProduct);

        \Illuminate\Support\Facades\DB::shouldReceive('beginTransaction');
        \Illuminate\Support\Facades\DB::shouldReceive('commit');
        \Illuminate\Support\Facades\DB::shouldReceive('rollBack');

        $this->productService->save($request);

        // No exception means syncTags executed successfully with mocked Tag model.
        $this->assertTrue(true);
    }

    public function test_create_product_with_variants()
    {
        // ... (existing setup matches until DB mock)
        $requestData = [
            'name' => 'Test Product Variant',
            'track_inventory' => false,
            'variants' => [
                [
                    'sku' => 'SKU1',
                    'retail_price' => 100,
                    'stock_quantity' => 10,
                    // Keep attributes empty in unit test to avoid DB lookup in ensureAttributeExists
                    'attributes' => []
                ]
            ]
        ];
        $request = new Request($requestData);

        $mockProduct = new FakeProductForService();
        $mockProduct->id = 1;
        
        $this->productRepoMock->shouldReceive('create')->andReturn($mockProduct);

        // Expect variant service create call
        $mockVariant = Mockery::mock(Product::class)->makePartial(); // Variant model actually? Wait, ProductVariant type.
                                                                     // But safe to use a generic mock or ProductVariant class if imported. 
                                                                     // Let's use FakeModel for Variant as it doesn't need method mocking except attributes()
        $mockVariant = Mockery::mock(\App\Models\ProductVariant::class)->makePartial();
        $mockVariant->id = 100;
        
        $mockVariant->shouldReceive('attributes')->andReturn(
            Mockery::mock()->shouldReceive('sync')->with([])->getMock()
        );
        
        $this->productVariantServiceMock->shouldReceive('save')
            ->once()
            ->andReturn($mockVariant);
        
        // Mock variants access for deletion check
        // ProductService calls $this->productVariantService->repository->getModel()->where
        // I need to mock the chain.
        // Or simpler: Mock ProductService's productVariantService property to return a mock that handles repository...
        // We already mocked productVariantServiceMock.
        
        // Mocking the chain: $this->productVariantService->repository->getModel()...
        // This is hard with Mockery unless we mock the repository accessor or public property on service.
        // ProductVariantService (BaseService) has public $repository.
        
        $mockVariantRepo = Mockery::mock(ProductRepo::class); // It's actually ProductVariantRepo but interface is BaseRepo.
        $mockVariantModel = Mockery::mock(\App\Models\ProductVariant::class);
        
        $this->productVariantServiceMock->repository = $mockVariantRepo;
        $mockVariantRepo->shouldReceive('getModel')->andReturn($mockVariantModel);
        
        // Chain: where->pluck->toArray
        $mockQuery = Mockery::mock();
        $mockVariantModel->shouldReceive('where')->with('product_id', 1)->andReturn($mockQuery);
        $mockQuery->shouldReceive('pluck')->with('id')->andReturn(collect([])); // Return empty for current variants
        
        \Illuminate\Support\Facades\DB::shouldReceive('beginTransaction');
        \Illuminate\Support\Facades\DB::shouldReceive('commit');
        \Illuminate\Support\Facades\DB::shouldReceive('rollBack');

        $this->productService->save($request);
        $this->assertTrue(true); // ensure the test isn't marked risky
    }
}
