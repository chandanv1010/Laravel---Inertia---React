<?php  
namespace Tests\Feature\Services\Cache;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Repositories\BaseRepo;

class BaseCacheServiceTest extends TestCase
{
    protected $service;
    protected $repositoryMock;
    protected $mockModel;

    protected function setUp(): void
    {
        parent::setUp();
        
        Cache::flush();
        config([
            'cache_modules.enabled' => true,
            'cache_modules.ttl' => 3600,
            'cache_modules.ttl_paginate.default' => 600,
            'cache_modules.ttl_paginate.dataset' => 3600,
            'cache_modules.ttl_paginate.hot_keyword' => 1800,
            'cache_modules.ttl_paginate.cache_all' => 300,
            'cache_modules.hot_keywords.min_requests' => 5,
            'cache_modules.lazy_cache.enabled' => false,
            'cache_modules.lazy_cache.min_hits' => 3,
        ]);
        
        $this->repositoryMock = Mockery::mock(BaseRepo::class);
        $this->mockModel = Mockery::mock();
        $this->mockModel->shouldReceive('getTable')->andReturn('test_modules');
        
        $this->repositoryMock->shouldReceive('getTable')->andReturn('test_modules');
        $this->repositoryMock->shouldReceive('getFillable')->andReturn(['name']);
        $this->repositoryMock->shouldReceive('getRelationable')->andReturn([]);
        
        $this->service = new class($this->repositoryMock) extends BaseCacheService {
            protected $module = 'test_modules';
            protected $perpage = 20;
            protected $sort = ['id', 'desc'];
            protected $simpleFilter = [];
            protected $complexFilter = [];
            protected $dateFilter = [];
            protected $withFilters = [];
            protected $searchFields = ['name'];
            
            protected function prepareModelData(): static {
                return $this;
            }
        };
    }

    protected function tearDown(): void
    {
        Cache::flush();
        Mockery::close();
        parent::tearDown();
    }

    public function test_default_strategy_caches_default_queries()
    {
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->repositoryMock->shouldReceive('pagination')
            ->once()
            ->andReturn($mockPaginator);
        
        $result1 = $this->service->paginate($request);
        $result2 = $this->service->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result1);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result2);
    }

    public function test_cache_all_strategy_caches_all_queries()
    {
        $reflection = new \ReflectionClass($this->service);
        $property = $reflection->getProperty('cacheStrategy');
        $property->setAccessible(true);
        $property->setValue($this->service, 'cache_all');
        
        $request = new Request(['page' => 1, 'keyword' => 'test']);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(5);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->repositoryMock->shouldReceive('pagination')
            ->once()
            ->andReturn($mockPaginator);
        
        $result1 = $this->service->paginate($request);
        $result2 = $this->service->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result1);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result2);
    }

    public function test_dataset_strategy_caches_entire_dataset()
    {
        $reflection = new \ReflectionClass($this->service);
        $property = $reflection->getProperty('cacheStrategy');
        $property->setAccessible(true);
        $property->setValue($this->service, 'dataset');
        
        $request = new Request(['page' => 1]);
        
        $mockCollection = new Collection([
            (object)['id' => 1, 'name' => 'Test 1'],
            (object)['id' => 2, 'name' => 'Test 2'],
            (object)['id' => 3, 'name' => 'Test 3'],
        ]);
        
        $this->repositoryMock->shouldReceive('pagination')
            ->once()
            ->andReturn($mockCollection);
        
        $result1 = $this->service->paginate($request);
        $result2 = $this->service->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result1);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result2);
        $this->assertEquals(3, $result1->total());
        $this->assertEquals(3, $result2->total());
    }

    public function test_hot_queries_strategy_tracks_keywords()
    {
        $reflection = new \ReflectionClass($this->service);
        $property = $reflection->getProperty('cacheStrategy');
        $property->setAccessible(true);
        $property->setValue($this->service, 'hot_queries');
        
        config(['cache_modules.hot_keywords.min_requests' => 2]);
        
        $request = new Request(['keyword' => 'popular']);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(5);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->repositoryMock->shouldReceive('pagination')
            ->atLeast()->once()
            ->andReturn($mockPaginator);
        
        $result1 = $this->service->paginate($request);
        $result2 = $this->service->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result1);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result2);
        
        $result3 = $this->service->paginate($request);
        $result4 = $this->service->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result3);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result4);
    }

    public function test_lazy_strategy_only_caches_after_min_hits()
    {
        $reflection = new \ReflectionClass($this->service);
        $property = $reflection->getProperty('cacheStrategy');
        $property->setAccessible(true);
        $property->setValue($this->service, 'lazy');
        
        config([
            'cache_modules.lazy_cache.enabled' => true,
            'cache_modules.lazy_cache.min_hits' => 3,
        ]);
        
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->repositoryMock->shouldReceive('pagination')
            ->atLeast()->once()
            ->andReturn($mockPaginator);
        
        $result1 = $this->service->paginate($request);
        $result2 = $this->service->paginate($request);
        $result3 = $this->service->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result1);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result2);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result3);
        
        $result4 = $this->service->paginate($request);
        $result5 = $this->service->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result4);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result5);
    }

    public function test_show_method_caches_result()
    {
        $id = 1;
        $mockModel = (object)['id' => $id, 'name' => 'Test'];
        
        $this->repositoryMock->shouldReceive('findById')
            ->once()
            ->with($id, [])
            ->andReturn($mockModel);
        
        $result1 = $this->service->show($id);
        $result2 = $this->service->show($id);
        
        $this->assertEquals($id, $result1->id);
        $this->assertEquals($id, $result2->id);
    }

    public function test_invalidate_cache_clears_show_cache()
    {
        $id = 1;
        $mockModel = (object)['id' => $id, 'name' => 'Test'];
        
        $reflection = new \ReflectionClass($this->service);
        $property = $reflection->getProperty('model');
        $property->setAccessible(true);
        $property->setValue($this->service, $mockModel);
        
        $this->repositoryMock->shouldReceive('findById')
            ->twice()
            ->with($id, [])
            ->andReturn($mockModel);
        
        $this->service->show($id);
        $this->service->invalidateCache();
        $this->service->show($id);
        
        $this->assertTrue(true);
    }

    public function test_cache_disabled_bypasses_caching()
    {
        $reflection = new \ReflectionClass($this->service);
        $property = $reflection->getProperty('cacheEnabled');
        $property->setAccessible(true);
        $property->setValue($this->service, false);
        
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->repositoryMock->shouldReceive('pagination')
            ->twice()
            ->andReturn($mockPaginator);
        
        $result1 = $this->service->paginate($request);
        $result2 = $this->service->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result1);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result2);
    }

    public function test_config_disabled_bypasses_caching()
    {
        config(['cache_modules.enabled' => false]);
        
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        
        $this->repositoryMock->shouldReceive('pagination')
            ->twice()
            ->andReturn($mockPaginator);
        
        $result1 = $this->service->paginate($request);
        $result2 = $this->service->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result1);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result2);
    }

    public function test_invalidate_all_cache_clears_all_types()
    {
        $reflection = new \ReflectionClass($this->service);
        $property = $reflection->getProperty('cacheStrategy');
        $property->setAccessible(true);
        $property->setValue($this->service, 'cache_all');
        
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->repositoryMock->shouldReceive('pagination')
            ->atLeast()->once()
            ->andReturn($mockPaginator);
        
        $result1 = $this->service->paginate($request);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result1);
        
        $this->service->invalidateAllCache();
        
        $result2 = $this->service->paginate($request);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result2);
    }
}

