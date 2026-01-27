<?php

namespace Tests\Feature;

use Tests\Feature\Services\Cache\BaseCacheServiceTest;
use Mockery;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Services\Impl\V1\Promotion\PromotionService;
use App\Repositories\Promotion\PromotionRepo;
use App\Models\Promotion;
use App\Models\CustomerCatalogue;
use App\Models\Store;
use Tests\Fakes\FakeModel;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PromotionServiceTest extends BaseCacheServiceTest
{
    protected $promotionService;
    protected $promotionRepoMock;
    protected $mockPromotionModel;
    protected $mockCustomerGroupRelation;
    protected $mockStoreRelation;

    protected function setUp(): void
    {
        parent::setUp();
        
        Cache::flush();
        
        config([
            'cache_modules.enabled' => true,
            'cache_modules.ttl_paginate.default' => 600,
            'tracking.enabled' => false,
        ]);
        
        // Mock repository
        $this->promotionRepoMock = Mockery::mock(PromotionRepo::class);
        
        // Mock Promotion model
        $this->mockPromotionModel = Mockery::mock(Promotion::class);
        $this->mockPromotionModel->shouldReceive('getTable')->andReturn('promotions');
        $this->promotionRepoMock->shouldReceive('getModel')->andReturn($this->mockPromotionModel);
        $this->promotionRepoMock->shouldReceive('getFillable')->andReturn([
            'user_id',
            'name',
            'type',
            'discount_type',
            'discount_value',
            'condition_type',
            'condition_value',
            'customer_group_type',
            'store_type',
            'combine_with_order_discount',
            'combine_with_product_discount',
            'combine_with_free_shipping',
            'start_date',
            'end_date',
            'no_end_date',
            'order',
            'publish',
        ]);
        $this->promotionRepoMock->shouldReceive('getRelationable')->andReturn(['customer_groups', 'stores']);
        
        // Mock relationships
        $this->mockCustomerGroupRelation = Mockery::mock(BelongsToMany::class);
        $this->mockStoreRelation = Mockery::mock(BelongsToMany::class);
        
        // Mock user
        $mockUser = (object)['id' => 1];
        Auth::shouldReceive('id')->andReturn($mockUser->id);
        
        // Create service instance
        $this->promotionService = new PromotionService($this->promotionRepoMock);
    }

    protected function tearDown(): void
    {
        Cache::flush();
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function test_create_promotion_success()
    {
        // Arrange
        $requestData = [
            'name' => 'Test Promotion',
            'type' => 'order_discount',
            'discount_type' => 'percentage',
            'discount_value' => 20,
            'condition_type' => 'min_order_amount',
            'condition_value' => 100000,
            'customer_group_type' => 'selected',
            'store_type' => 'all',
            'combine_with_order_discount' => false,
            'combine_with_product_discount' => false,
            'combine_with_free_shipping' => false,
            'start_date' => '2025-01-01 00:00:00',
            'end_date' => '2025-12-31 23:59:59',
            'no_end_date' => false,
            'publish' => '2',
            'order' => 0,
            'customer_group_ids' => [1, 2],
            'store_ids' => [],
        ];
        
        $request = new Request($requestData);
        
        $mockPromotion = new FakeModel(['id' => 1]);
        $mockPromotion->customer_group_type = 'selected';
        $mockPromotion->store_type = 'all';
        
        // Mock customer_groups relationship
        $mockPromotion = Mockery::mock($mockPromotion);
        $mockPromotion->id = 1;
        $mockPromotion->customer_group_type = 'selected';
        $mockPromotion->store_type = 'all';
        $mockPromotion->shouldReceive('customer_groups')
            ->andReturn($this->mockCustomerGroupRelation);
        $this->mockCustomerGroupRelation->shouldReceive('sync')
            ->once()
            ->with([1, 2])
            ->andReturn(true);
        
        // Mock stores relationship
        $mockPromotion->shouldReceive('stores')
            ->andReturn($this->mockStoreRelation);
        $this->mockStoreRelation->shouldReceive('detach')
            ->once()
            ->andReturn(true);
        
        // Mock repository methods
        $this->promotionRepoMock->shouldReceive('create')
            ->once()
            ->andReturn($mockPromotion);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        DB::shouldReceive('rollBack')->never();
        
        // Act
        $result = $this->promotionService->save($request);
        
        // Assert
        $this->assertNotNull($result);
        $this->assertEquals(1, $result->id);
    }

    /** @test */
    public function test_create_promotion_with_no_end_date()
    {
        // Arrange
        $requestData = [
            'name' => 'Test Promotion No End',
            'type' => 'order_discount',
            'discount_type' => 'fixed_amount',
            'discount_value' => 50000,
            'condition_type' => 'none',
            'customer_group_type' => 'all',
            'store_type' => 'all',
            'combine_with_order_discount' => false,
            'combine_with_product_discount' => false,
            'combine_with_free_shipping' => false,
            'start_date' => '2025-01-01 00:00:00',
            'no_end_date' => true,
            'publish' => '2',
            'order' => 0,
            'customer_group_ids' => [],
            'store_ids' => [],
        ];
        
        $request = new Request($requestData);
        
        $mockPromotion = new FakeModel(['id' => 2]);
        $mockPromotion->customer_group_type = 'all';
        $mockPromotion->store_type = 'all';
        
        // Mock relationships
        $mockPromotion = Mockery::mock($mockPromotion);
        $mockPromotion->id = 2;
        $mockPromotion->customer_group_type = 'all';
        $mockPromotion->store_type = 'all';
        $mockPromotion->shouldReceive('customer_groups')
            ->andReturn($this->mockCustomerGroupRelation);
        $this->mockCustomerGroupRelation->shouldReceive('detach')
            ->once()
            ->andReturn(true);
        
        $mockPromotion->shouldReceive('stores')
            ->andReturn($this->mockStoreRelation);
        $this->mockStoreRelation->shouldReceive('detach')
            ->once()
            ->andReturn(true);
        
        $this->promotionRepoMock->shouldReceive('create')
            ->once()
            ->andReturn($mockPromotion);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        // Act
        $result = $this->promotionService->save($request);
        
        // Assert
        $this->assertNotNull($result);
        $this->assertEquals(2, $result->id);
    }

    /** @test */
    public function test_update_promotion_success()
    {
        // Arrange
        $promotionId = 1;
        $requestData = [
            'name' => 'Updated Promotion',
            'type' => 'order_discount',
            'discount_type' => 'percentage',
            'discount_value' => 25,
            'condition_type' => 'min_order_amount',
            'condition_value' => 200000,
            'customer_group_type' => 'selected',
            'store_type' => 'selected',
            'combine_with_order_discount' => true,
            'combine_with_product_discount' => false,
            'combine_with_free_shipping' => false,
            'start_date' => '2025-01-01 00:00:00',
            'end_date' => '2025-12-31 23:59:59',
            'no_end_date' => false,
            'publish' => '2',
            'order' => 0,
            'customer_group_ids' => [1, 2, 3],
            'store_ids' => [1, 2],
        ];
        
        $request = new Request($requestData);
        
        $oldMockPromotion = new FakeModel(['id' => $promotionId]);
        $oldMockPromotion->customer_group_type = 'selected';
        $oldMockPromotion->store_type = 'selected';
        
        // Mock findById for old data
        $this->promotionRepoMock->shouldReceive('findById')
            ->once()
            ->with($promotionId, Mockery::type('array'))
            ->andReturn($oldMockPromotion);
        
        // Mock update - return new mock
        $updatedMockPromotion = new FakeModel(['id' => $promotionId]);
        $updatedMockPromotion->customer_group_type = 'selected';
        $updatedMockPromotion->store_type = 'selected';
        
        $this->promotionRepoMock->shouldReceive('update')
            ->once()
            ->with($promotionId, Mockery::type('array'))
            ->andReturn($updatedMockPromotion);
        
        // Mock relationships on updated model
        $updatedMockPromotion = Mockery::mock($updatedMockPromotion);
        $updatedMockPromotion->id = $promotionId;
        $updatedMockPromotion->customer_group_type = 'selected';
        $updatedMockPromotion->store_type = 'selected';
        $updatedMockPromotion->shouldReceive('customer_groups')
            ->andReturn($this->mockCustomerGroupRelation);
        $this->mockCustomerGroupRelation->shouldReceive('sync')
            ->once()
            ->with([1, 2, 3])
            ->andReturn(true);
        
        $updatedMockPromotion->shouldReceive('stores')
            ->andReturn($this->mockStoreRelation);
        $this->mockStoreRelation->shouldReceive('sync')
            ->once()
            ->with([1, 2])
            ->andReturn(true);
        
        $updatedMockPromotion->shouldReceive('toArray')
            ->andReturn(['id' => $promotionId, 'name' => 'Updated Promotion']);
        
        // Set model property using reflection
        $reflection = new \ReflectionClass($this->promotionService);
        $modelProperty = $reflection->getProperty('model');
        $modelProperty->setAccessible(true);
        $modelProperty->setValue($this->promotionService, $updatedMockPromotion);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        DB::shouldReceive('rollBack')->never();
        
        // Act
        $result = $this->promotionService->save($request, $promotionId);
        
        // Assert
        $this->assertNotNull($result);
        $this->assertEquals($promotionId, $result->id);
    }

    /** @test */
    public function test_paginate_promotions()
    {
        // Arrange
        $request = new Request(['page' => 1, 'perpage' => 20]);
        
        $mockPaginator = Mockery::mock(\Illuminate\Pagination\LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->promotionRepoMock->shouldReceive('pagination')
            ->once()
            ->andReturn($mockPaginator);
        
        // Act
        $result = $this->promotionService->paginate($request);
        
        // Assert
        $this->assertInstanceOf(\Illuminate\Pagination\LengthAwarePaginator::class, $result);
    }

    /** @test */
    public function test_show_promotion()
    {
        // Arrange
        $promotionId = 1;
        $mockPromotion = new FakeModel(['id' => $promotionId, 'name' => 'Test Promotion']);
        
        $this->promotionRepoMock->shouldReceive('findById')
            ->once()
            ->with($promotionId, Mockery::type('array'))
            ->andReturn($mockPromotion);
        
        // Act
        $result = $this->promotionService->show($promotionId);
        
        // Assert
        $this->assertNotNull($result);
        $this->assertEquals($promotionId, $result->id);
    }

    /** @test */
    public function test_destroy_promotion()
    {
        // Arrange
        $promotionId = 1;
        $mockPromotion = new FakeModel(['id' => $promotionId]);
        
        $this->promotionRepoMock->shouldReceive('findById')
            ->once()
            ->with($promotionId, Mockery::type('array'))
            ->andReturn($mockPromotion);
        
        $mockPromotion = Mockery::mock($mockPromotion);
        $mockPromotion->id = $promotionId;
        $mockPromotion->shouldReceive('delete')
            ->once()
            ->andReturn(true);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        DB::shouldReceive('rollBack')->never();
        
        // Act
        $result = $this->promotionService->destroy($promotionId);
        
        // Assert
        $this->assertTrue($result);
    }

    /** @test */
    public function test_prepare_model_data_sets_user_id()
    {
        // Arrange
        $requestData = [
            'name' => 'Test Promotion',
            'type' => 'order_discount',
            'publish' => '2',
        ];
        
        $request = new Request($requestData);
        
        // Act
        $reflection = new \ReflectionClass($this->promotionService);
        $setRequestMethod = $reflection->getMethod('setRequest');
        $setRequestMethod->setAccessible(true);
        $setRequestMethod->invoke($this->promotionService, $request);
        
        $method = $reflection->getMethod('prepareModelData');
        $method->setAccessible(true);
        $result = $method->invoke($this->promotionService);
        
        // Assert
        $property = $reflection->getProperty('modelData');
        $property->setAccessible(true);
        $modelData = $property->getValue($this->promotionService);
        
        $this->assertArrayHasKey('user_id', $modelData);
        $this->assertEquals(1, $modelData['user_id']);
    }

    /** @test */
    public function test_prepare_model_data_handles_no_end_date()
    {
        // Arrange
        $requestData = [
            'name' => 'Test Promotion',
            'type' => 'order_discount',
            'no_end_date' => true,
            'end_date' => '2025-12-31 23:59:59',
            'publish' => '2',
        ];
        
        $request = new Request($requestData);
        
        // Act
        $reflection = new \ReflectionClass($this->promotionService);
        $setRequestMethod = $reflection->getMethod('setRequest');
        $setRequestMethod->setAccessible(true);
        $setRequestMethod->invoke($this->promotionService, $request);
        
        $method = $reflection->getMethod('prepareModelData');
        $method->setAccessible(true);
        $result = $method->invoke($this->promotionService);
        
        // Assert
        $property = $reflection->getProperty('modelData');
        $property->setAccessible(true);
        $modelData = $property->getValue($this->promotionService);
        
        $this->assertNull($modelData['end_date']);
    }
}
