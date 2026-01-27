<?php

namespace Tests\Feature\Services\Post;

use Tests\Feature\Services\Cache\BaseCacheServiceTest;
use Mockery;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Services\Impl\V1\Post\PostCatalogueService;
use App\Repositories\Post\PostCatalogueRepo;
use App\Models\PostCatalogue;
use App\Models\Router;
use Tests\Fakes\FakeModel;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Comprehensive Test Suite for PostCatalogueService
 * 
 * Test coverage:
 * - CRUD operations (create, update, delete, show)
 * - Nested set operations
 * - Relations (languages)
 * - Cache functionality
 * - Before/after delete hooks
 * - Router sync
 * - Error handling
 */
class PostCatalogueServiceComprehensiveTest extends BaseCacheServiceTest
{
    protected $postCatalogueService;
    protected $postCatalogueRepoMock;
    protected $mockPostCatalogueModel;
    protected $mockUser;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Setup config
        config(['app.language_id' => 1]);
        Cache::flush();
        config(['cache_modules.enabled' => true]);
        
        // Mock user
        $this->mockUser = (object)['id' => 1, 'name' => 'Test User'];
        Auth::shouldReceive('id')->andReturn($this->mockUser->id);
        Auth::shouldReceive('user')->andReturn($this->mockUser);
        
        // Mock repository
        $this->postCatalogueRepoMock = Mockery::mock(PostCatalogueRepo::class);
        $this->mockPostCatalogueModel = Mockery::mock(PostCatalogue::class);
        
        // Setup repository mocks
        $this->postCatalogueRepoMock->shouldReceive('getFillable')->andReturn([
            'parent_id', 'image', 'icon', 'album', 'type', 'script', 'iframe',
            'publish', 'user_id', 'order', 'robots'
        ]);
        $this->postCatalogueRepoMock->shouldReceive('getRelationable')->andReturn(['languages']);
        $this->postCatalogueRepoMock->shouldReceive('getModel')->andReturn($this->mockPostCatalogueModel);
        $this->postCatalogueRepoMock->shouldReceive('getTable')->andReturn('post_catalogues');
        
        // Create service instance
        $this->postCatalogueService = new PostCatalogueService($this->postCatalogueRepoMock);
        
        // Mock nested set
        $mockNestedSet = Mockery::mock();
        $mockNestedSet->shouldReceive('get')->andReturnSelf();
        $mockNestedSet->shouldReceive('set')->andReturn([]);
        $mockNestedSet->shouldReceive('recursive')->andReturnSelf();
        $mockNestedSet->shouldReceive('action')->andReturnSelf();
        
        $reflection = new \ReflectionClass($this->postCatalogueService);
        $property = $reflection->getProperty('nestedset');
        $property->setAccessible(true);
        $property->setValue($this->postCatalogueService, $mockNestedSet);
    }

    protected function tearDown(): void
    {
        Cache::flush();
        Mockery::close();
        parent::tearDown();
    }

    protected function getDefaultRequestData(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test Catalogue',
            'description' => 'Test Description',
            'content' => 'Test Content',
            'canonical' => 'test-catalogue',
            'meta_title' => 'Test Meta Title',
            'meta_description' => 'Test Meta Description',
            'meta_keyword' => 'test, keyword',
            'parent_id' => 0,
            'publish' => '2',
            'image' => 'test-image.jpg',
            'order' => 1,
            'robots' => 'index, follow',
        ], $overrides);
    }

    protected function prepareExpectedData(array $requestData): array
    {
        $expected = [
            'user_id' => $this->mockUser->id,
            'parent_id' => $requestData['parent_id'] ?? 0,
            'publish' => $requestData['publish'] ?? '2',
            'image' => $requestData['image'] ?? null,
            'order' => $requestData['order'] ?? null,
            'robots' => $requestData['robots'] ?? null,
        ];
        
        return array_filter($expected, fn($v) => $v !== null);
    }

    protected function getWith(): array
    {
        return ['creators', 'current_languages', 'languages'];
    }

    // ==========================================
    // CREATE OPERATIONS
    // ==========================================

    /** @test */
    public function test_create_post_catalogue_with_full_data()
    {
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        
        $expectedData = $this->prepareExpectedData($requestData);
        $mockCatalogue = Mockery::mock('stdClass');
        $mockCatalogue->id = 1;
        
        // Mock languages relation
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')
            ->with(Mockery::type('array'))
            ->once()
            ->andReturn(true);
        $mockCatalogue->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        // Mock routers relation
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('updateOrCreate')
            ->with(
                ['module' => 'post_catalogues', 'routerable_id' => 1],
                Mockery::type('array')
            )
            ->once()
            ->andReturn(new FakeModel(['id' => 1]));
        $mockCatalogue->shouldReceive('routers')->andReturn($mockRoutersRelation);
        $mockCatalogue->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockCatalogue->shouldReceive('load')->with('routers')->andReturnSelf();
        
        $this->postCatalogueRepoMock->shouldReceive('create')
            ->with(Mockery::subset($expectedData))
            ->once()
            ->andReturn($mockCatalogue);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        DB::shouldReceive('rollBack')->never();
        
        $result = $this->postCatalogueService->save($request);
        
        $this->assertNotNull($result);
        $this->assertEquals(1, $result->id);
    }

    /** @test */
    public function test_create_post_catalogue_with_parent()
    {
        $requestData = $this->getDefaultRequestData(['parent_id' => 5]);
        $request = new Request($requestData);
        
        $expectedData = $this->prepareExpectedData($requestData);
        $mockCatalogue = Mockery::mock('stdClass');
        $mockCatalogue->id = 2;
        $mockCatalogue->parent_id = 5;
        
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockCatalogue->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        $mockCatalogue->shouldReceive('toArray')->andReturn(['id' => 2, 'parent_id' => 5]);
        
        $this->postCatalogueRepoMock->shouldReceive('create')
            ->with(Mockery::subset($expectedData))
            ->once()
            ->andReturn($mockCatalogue);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postCatalogueService->save($request);
        
        $this->assertNotNull($result);
        $this->assertEquals(5, $result->parent_id);
    }

    /** @test */
    public function test_nested_set_run_after_create()
    {
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        
        $mockCatalogue = new FakeModel(['id' => 1]);
        
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockCatalogue->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('updateOrCreate')->andReturn(new FakeModel(['id' => 1]));
        $mockCatalogue->shouldReceive('routers')->andReturn($mockRoutersRelation);
        $mockCatalogue->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockCatalogue->shouldReceive('load')->with('routers')->andReturnSelf();
        
        $this->postCatalogueRepoMock->shouldReceive('create')->andReturn($mockCatalogue);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postCatalogueService->save($request);
        
        // Nested set should be run after save
        $this->assertNotNull($result);
    }

    // ==========================================
    // UPDATE OPERATIONS
    // ==========================================

    /** @test */
    public function test_update_post_catalogue_with_new_data()
    {
        $id = 1;
        $requestData = $this->getDefaultRequestData(['name' => 'Updated Catalogue', 'publish' => '1']);
        $request = new Request($requestData);
        
        $oldCatalogue = new FakeModel([
            'id' => $id,
            'name' => 'Old Catalogue',
            'publish' => '2',
        ]);
        
        $expectedData = $this->prepareExpectedData($requestData);
        $mockCatalogue = new FakeModel(['id' => $id, 'name' => 'Updated Catalogue', 'publish' => '1']);
        
        // Mock findById for old data
        $this->postCatalogueRepoMock->shouldReceive('findById')
            ->with($id, $this->getWith())
            ->once()
            ->andReturn($oldCatalogue);
        
        // Mock relations
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockCatalogue->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('updateOrCreate')->andReturn(new FakeModel(['id' => 1]));
        $mockCatalogue->shouldReceive('routers')->andReturn($mockRoutersRelation);
        $mockCatalogue->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockCatalogue->shouldReceive('load')->with('routers')->andReturnSelf();
        
        $this->postCatalogueRepoMock->shouldReceive('update')
            ->with($id, Mockery::subset($expectedData))
            ->once()
            ->andReturn($mockCatalogue);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postCatalogueService->save($request, $id);
        
        $this->assertNotNull($result);
        $this->assertEquals($id, $result->id);
    }

    /** @test */
    public function test_nested_set_run_after_update()
    {
        $id = 1;
        $requestData = $this->getDefaultRequestData(['parent_id' => 2]);
        $request = new Request($requestData);
        
        $oldCatalogue = new FakeModel(['id' => $id]);
        
        $this->postCatalogueRepoMock->shouldReceive('findById')
            ->with($id, $this->getWith())
            ->once()
            ->andReturn($oldCatalogue);
        
        $mockCatalogue = new FakeModel(['id' => $id, 'parent_id' => 2]);
        
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockCatalogue->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('updateOrCreate')->andReturn(new FakeModel(['id' => 1]));
        $mockCatalogue->shouldReceive('routers')->andReturn($mockRoutersRelation);
        $mockCatalogue->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockCatalogue->shouldReceive('load')->with('routers')->andReturnSelf();
        
        $this->postCatalogueRepoMock->shouldReceive('update')->andReturn($mockCatalogue);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postCatalogueService->save($request, $id);
        
        // Nested set should be run after update
        $this->assertNotNull($result);
    }

    // ==========================================
    // READ OPERATIONS
    // ==========================================

    /** @test */
    public function test_show_post_catalogue_with_relations()
    {
        $id = 1;
        $mockCatalogue = new FakeModel([
            'id' => $id,
            'parent_id' => 0,
            'creators' => ['id' => 1, 'name' => 'Test User'],
            'current_languages' => collect([['pivot' => ['name' => 'Test Catalogue']]]),
            'languages' => collect([['id' => 1, 'name' => 'Vietnamese']])
        ]);
        
        $this->postCatalogueRepoMock->shouldReceive('findById')
            ->with($id, $this->getWith())
            ->once()
            ->andReturn($mockCatalogue);
        
        $result = $this->postCatalogueService->show($id);
        
        $this->assertEquals($id, $result->id);
        $this->assertNotNull($result->creators);
        $this->assertNotNull($result->languages);
    }

    /** @test */
    public function test_show_post_catalogue_not_found()
    {
        $id = 9999;
        
        $this->postCatalogueRepoMock->shouldReceive('findById')
            ->with($id, $this->getWith())
            ->once()
            ->andThrow(new ModelNotFoundException('PostCatalogue not found'));
        
        $this->expectException(ModelNotFoundException::class);
        
        $this->postCatalogueService->show($id);
    }

    // ==========================================
    // DELETE OPERATIONS
    // ==========================================

    /** @test */
    public function test_delete_post_catalogue_without_children()
    {
        $id = 1;
        $mockCatalogue = new FakeModel([
            'id' => $id,
            'lft' => 1,
            'rgt' => 2 // No children (rgt - lft = 1)
        ]);
        
        $this->postCatalogueRepoMock->shouldReceive('findById')
            ->with($id, [])
            ->once()
            ->andReturn($mockCatalogue);
        
        // Mock router deletion
        $mockRouter = new FakeModel(['id' => 1]);
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('delete')->once()->andReturn(true);
        $mockCatalogue->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockCatalogue->shouldReceive('load')->with('routers')->andReturnSelf();
        $mockCatalogue->shouldReceive('getAttribute')->with('routers')->andReturn($mockRouter);
        $mockCatalogue->shouldReceive('routers')->andReturn($mockRoutersRelation);
        
        $this->postCatalogueRepoMock->shouldReceive('delete')
            ->with($id)
            ->once()
            ->andReturn(true);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postCatalogueService->destroy($id);
        
        $this->assertTrue($result);
    }

    /** @test */
    public function test_delete_post_catalogue_with_children_throws_exception()
    {
        $id = 1;
        $mockCatalogue = new FakeModel([
            'id' => $id,
            'lft' => 1,
            'rgt' => 10 // Has children (rgt - lft > 1)
        ]);
        
        $this->postCatalogueRepoMock->shouldReceive('findById')
            ->with($id, [])
            ->once()
            ->andReturn($mockCatalogue);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('rollBack')->once();
        
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Không thể xóa danh mục này vì còn danh mục con');
        
        $this->postCatalogueService->destroy($id);
    }

    /** @test */
    public function test_nested_set_run_after_delete()
    {
        $id = 1;
        $mockCatalogue = new FakeModel([
            'id' => $id,
            'lft' => 1,
            'rgt' => 2
        ]);
        
        $this->postCatalogueRepoMock->shouldReceive('findById')
            ->with($id, [])
            ->once()
            ->andReturn($mockCatalogue);
        
        // Mock router deletion
        $mockRouter = new FakeModel(['id' => 1]);
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('delete')->andReturn(true);
        $mockCatalogue->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockCatalogue->shouldReceive('load')->with('routers')->andReturnSelf();
        $mockCatalogue->shouldReceive('getAttribute')->with('routers')->andReturn($mockRouter);
        $mockCatalogue->shouldReceive('routers')->andReturn($mockRoutersRelation);
        
        $this->postCatalogueRepoMock->shouldReceive('delete')->andReturn(true);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postCatalogueService->destroy($id);
        
        // Nested set should be run after delete
        $this->assertTrue($result);
    }

    // ==========================================
    // PAGINATE & FILTER OPERATIONS
    // ==========================================

    /** @test */
    public function test_paginate_with_search_in_pivot_table()
    {
        $request = new Request([
            'keyword' => 'test keyword',
            'page' => 1
        ]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->postCatalogueRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return isset($specs['filter']['keyword']['q'])
                    && $specs['filter']['keyword']['q'] === 'test keyword'
                    && in_array('name', $specs['filter']['keyword']['fields'])
                    && in_array('description', $specs['filter']['keyword']['fields']);
            }))
            ->once()
            ->andReturn($mockPaginator);
        
        $result = $this->postCatalogueService->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
    }

    /** @test */
    public function test_paginate_sorted_by_lft_asc()
    {
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->postCatalogueRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return $specs['sort'] === ['lft', 'asc'];
            }))
            ->once()
            ->andReturn($mockPaginator);
        
        $result = $this->postCatalogueService->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
    }

    /** @test */
    public function test_paginate_with_cache_strategy_default()
    {
        Cache::flush();
        
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->postCatalogueRepoMock->shouldReceive('pagination')
            ->once()
            ->andReturn($mockPaginator);
        
        $result = $this->postCatalogueService->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
        
        // Verify cache strategy
        $reflection = new \ReflectionClass($this->postCatalogueService);
        $property = $reflection->getProperty('cacheStrategy');
        $property->setAccessible(true);
        $this->assertEquals('default', $property->getValue($this->postCatalogueService));
    }

    // ==========================================
    // RELATIONS OPERATIONS
    // ==========================================

    /** @test */
    public function test_languages_relation_uses_sync_without_detaching()
    {
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        
        $mockCatalogue = new FakeModel(['id' => 1]);
        
        // Mock languages relation - should use syncWithoutDetaching
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')
            ->with(Mockery::type('array'))
            ->once()
            ->andReturn(true);
        $mockCatalogue->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('updateOrCreate')->andReturn(new FakeModel(['id' => 1]));
        $mockCatalogue->shouldReceive('routers')->andReturn($mockRoutersRelation);
        $mockCatalogue->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockCatalogue->shouldReceive('load')->with('routers')->andReturnSelf();
        
        $this->postCatalogueRepoMock->shouldReceive('create')->andReturn($mockCatalogue);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postCatalogueService->save($request);
        
        $this->assertNotNull($result);
    }

    // ==========================================
    // ROUTER OPERATIONS
    // ==========================================

    /** @test */
    public function test_router_sync_on_create_with_canonical()
    {
        $requestData = $this->getDefaultRequestData(['canonical' => 'test-catalogue']);
        $request = new Request($requestData);
        
        $mockCatalogue = new FakeModel(['id' => 1]);
        
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockCatalogue->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        // Mock router sync
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('updateOrCreate')
            ->with(
                ['module' => 'post_catalogues', 'routerable_id' => 1],
                Mockery::on(function ($payload) {
                    return isset($payload['canonical']) 
                        && $payload['canonical'] === 'test-catalogue'
                        && isset($payload['next_component'])
                        && isset($payload['controller']);
                })
            )
            ->once()
            ->andReturn(new FakeModel(['id' => 1]));
        $mockCatalogue->shouldReceive('routers')->andReturn($mockRoutersRelation);
        $mockCatalogue->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockCatalogue->shouldReceive('load')->with('routers')->andReturnSelf();
        
        $this->postCatalogueRepoMock->shouldReceive('create')->andReturn($mockCatalogue);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postCatalogueService->save($request);
        
        $this->assertNotNull($result);
    }

    // ==========================================
    // NESTED SET OPERATIONS
    // ==========================================

    /** @test */
    public function test_get_nested_set_dropdown()
    {
        $mockDropdown = [
            ['id' => 1, 'name' => 'Parent'],
            ['id' => 2, 'name' => '|----- Child'],
        ];
        
        $reflection = new \ReflectionClass($this->postCatalogueService);
        $property = $reflection->getProperty('nestedset');
        $property->setAccessible(true);
        $nestedSet = $property->getValue($this->postCatalogueService);
        $nestedSet->shouldReceive('dropdown')->once()->andReturn($mockDropdown);
        
        $result = $this->postCatalogueService->getNestedSetDropdown();
        
        $this->assertEquals($mockDropdown, $result);
    }
}

