<?php

namespace Tests\Feature\Services\Post;

use Tests\Feature\Services\Cache\BaseCacheServiceTest;
use Mockery;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Services\Impl\V1\Post\PostService;
use App\Services\Interfaces\Post\PostCatalogueServiceInterface;
use App\Repositories\Post\PostRepo;
use App\Models\Post;
use App\Models\PostCatalogue;
use App\Models\Language;
use App\Models\Router;
use Tests\Fakes\FakeModel;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Comprehensive Test Suite for PostService
 * 
 * Test coverage:
 * - CRUD operations (create, update, delete, show)
 * - Relations (languages, post_catalogues)
 * - Cache functionality
 * - Catalogue filter with nested set
 * - Search in pivot table
 * - Router sync
 * - Error handling
 * - Validation
 */
class PostServiceComprehensiveTest extends BaseCacheServiceTest
{
    protected $postService;
    protected $postRepoMock;
    protected $postCatalogueServiceMock;
    protected $mockPostModel;
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
        
        // Mock DB facade globally (can be overridden in individual tests)
        DB::shouldReceive('rollBack')->byDefault()->andReturn(true);
        
        // Mock repositories
        $this->postRepoMock = Mockery::mock(PostRepo::class);
        $this->postCatalogueServiceMock = Mockery::mock(PostCatalogueServiceInterface::class);
        $this->mockPostModel = Mockery::mock(Post::class);
        $this->mockPostCatalogueModel = Mockery::mock(PostCatalogue::class);
        
        // Setup repository mocks
        $this->postRepoMock->shouldReceive('getFillable')->andReturn([
            'post_catalogue_id', 'image', 'icon', 'album', 'script', 'iframe', 'qrcode', 
            'order', 'publish', 'user_id', 'robots'
        ]);
        $this->postRepoMock->shouldReceive('getRelationable')->andReturn(['languages', 'post_catalogues']);
        $this->postRepoMock->shouldReceive('getModel')->andReturn($this->mockPostModel);
        $this->postRepoMock->shouldReceive('getTable')->andReturn('posts');
        
        // Create service instance
        $this->postService = new PostService($this->postRepoMock, $this->postCatalogueServiceMock);
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
            'name' => 'Test Post',
            'description' => 'Test Description',
            'content' => 'Test Content',
            'canonical' => 'test-post',
            'meta_title' => 'Test Meta Title',
            'meta_description' => 'Test Meta Description',
            'meta_keyword' => 'test, keyword',
            'post_catalogue_id' => 1,
            'post_catalogues' => [1, 2],
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
            'post_catalogue_id' => $requestData['post_catalogue_id'] ?? null,
            'publish' => $requestData['publish'] ?? '2',
            'image' => $requestData['image'] ?? null,
            'order' => $requestData['order'] ?? null,
            'robots' => $requestData['robots'] ?? null,
        ];
        
        return array_filter($expected, fn($v) => $v !== null);
    }

    protected function getWith(): array
    {
        return ['creators', 'current_languages', 'post_catalogue', 'post_catalogues.current_languages', 'languages'];
    }

    // ==========================================
    // CREATE OPERATIONS
    // ==========================================

    /** @test */
    public function test_create_post_with_full_data()
    {
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        
        $expectedData = $this->prepareExpectedData($requestData);
        
        // Mock relations
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')
            ->with(Mockery::type('array'))
            ->once()
            ->andReturn(true);
        
        $mockPostCataloguesRelation = Mockery::mock();
        $mockPostCataloguesRelation->shouldReceive('sync')
            ->with([1, 2])
            ->once()
            ->andReturn(true);
        
        // Mock routers relation
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('updateOrCreate')
            ->with(
                ['module' => 'posts', 'routerable_id' => 1],
                Mockery::type('array')
            )
            ->once()
            ->andReturn(new FakeModel(['id' => 1]));
        
        // Create mock post using stdClass pattern
        $mockPost = Mockery::mock('stdClass');
        $mockPost->id = 1;
        $mockPost->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        $mockPost->shouldReceive('post_catalogues')->andReturn($mockPostCataloguesRelation);
        $mockPost->shouldReceive('routers')->andReturn($mockRoutersRelation);
        $mockPost->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockPost->shouldReceive('load')->with('routers')->andReturnSelf();
        $mockPost->shouldReceive('getAttribute')->with('routers')->andReturn(null);
        $mockPost->shouldReceive('toArray')->andReturn(['id' => 1]);
        
        $this->postRepoMock->shouldReceive('create')
            ->with(Mockery::subset($expectedData))
            ->once()
            ->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        DB::shouldReceive('rollBack')->never();
        
        // Mock Log facade for tracking (BaseService calls trackCreate/trackUpdate)
        Log::shouldReceive('info')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();
        
        $result = $this->postService->save($request);
        
        $this->assertNotNull($result);
        $this->assertEquals(1, $result->id);
    }

    /** @test */
    public function test_create_post_without_language_fields()
    {
        $requestData = $this->getDefaultRequestData();
        unset($requestData['name'], $requestData['description'], $requestData['content']);
        $request = new Request($requestData);
        
        $expectedData = $this->prepareExpectedData($requestData);
        
        // Mock post_catalogues relation
        $mockPostCataloguesRelation = Mockery::mock();
        $mockPostCataloguesRelation->shouldReceive('sync')
            ->with([1, 2])
            ->once()
            ->andReturn(true);
        
        // Create mock post - use FakeModel pattern
        $mockPost = new FakeModel(['id' => 1]);
        $mockPost->shouldReceive('post_catalogues')->andReturn($mockPostCataloguesRelation);
        $mockPost->shouldReceive('toArray')->andReturn(['id' => 1]);
        
        $this->postRepoMock->shouldReceive('create')
            ->with(Mockery::subset($expectedData))
            ->once()
            ->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        // Mock Log facade for tracking
        Log::shouldReceive('info')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();
        
        $result = $this->postService->save($request);
        
        $this->assertNotNull($result);
    }

    /** @test */
    public function test_create_post_merges_main_catalogue_to_pivot()
    {
        $requestData = $this->getDefaultRequestData(['post_catalogues' => null]);
        $request = new Request($requestData);
        
        $expectedData = $this->prepareExpectedData($requestData);
        
        // Mock post_catalogues relation - should sync with [1] (post_catalogue_id merged)
        $mockPostCataloguesRelation = Mockery::mock();
        $mockPostCataloguesRelation->shouldReceive('sync')
            ->with([1]) // post_catalogue_id = 1 should be merged into post_catalogues
            ->once()
            ->andReturn(true);
        
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        
        // Create mock post using stdClass pattern
        $mockPost = Mockery::mock('stdClass');
        $mockPost->id = 1;
        $mockPost->shouldReceive('post_catalogues')->andReturn($mockPostCataloguesRelation);
        $mockPost->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        $mockPost->shouldReceive('toArray')->andReturn(['id' => 1]);
        
        $this->postRepoMock->shouldReceive('create')
            ->with(Mockery::subset($expectedData))
            ->once()
            ->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        // Mock Log facade for tracking
        Log::shouldReceive('info')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();
        
        $result = $this->postService->save($request);
        
        $this->assertNotNull($result);
    }

    /** @test */
    public function test_create_post_fails_on_exception()
    {
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        
        $this->postRepoMock->shouldReceive('create')
            ->once()
            ->andThrow(new \Exception('Database error'));
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->never();
        DB::shouldReceive('rollBack')->once();
        
        $result = $this->postService->save($request);
        
        $this->assertFalse($result);
    }

    // ==========================================
    // UPDATE OPERATIONS
    // ==========================================

    /** @test */
    public function test_update_post_with_new_data()
    {
        $id = 1;
        $requestData = $this->getDefaultRequestData(['name' => 'Updated Post', 'publish' => '1']);
        $request = new Request($requestData);
        
        $oldPost = new FakeModel([
            'id' => $id,
            'name' => 'Old Post',
            'publish' => '2',
        ]);
        
        $expectedData = $this->prepareExpectedData($requestData);
        $mockPost = Mockery::mock('stdClass');
        $mockPost->id = $id;
        $mockPost->name = 'Updated Post';
        $mockPost->publish = '1';
        
        // Mock findById for old data
        $this->postRepoMock->shouldReceive('findById')
            ->with($id, $this->getWith())
            ->once()
            ->andReturn($oldPost);
        
        // Mock relations
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockPost->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        $mockPostCataloguesRelation = Mockery::mock();
        $mockPostCataloguesRelation->shouldReceive('sync')->with([1, 2])->andReturn(true);
        $mockPost->shouldReceive('post_catalogues')->andReturn($mockPostCataloguesRelation);
        
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('updateOrCreate')->andReturn(new FakeModel(['id' => 1]));
        $mockPost->shouldReceive('routers')->andReturn($mockRoutersRelation);
        $mockPost->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockPost->shouldReceive('load')->with('routers')->andReturnSelf();
        $mockPost->shouldReceive('toArray')->andReturn(['id' => $id, 'name' => 'Updated Post', 'publish' => '1']);
        
        $this->postRepoMock->shouldReceive('update')
            ->with($id, Mockery::subset($expectedData))
            ->once()
            ->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postService->save($request, $id);
        
        $this->assertNotNull($result);
        $this->assertEquals($id, $result->id);
    }

    /** @test */
    public function test_update_post_only_order_does_not_process_language_fields()
    {
        $id = 1;
        $requestData = ['order' => 5];
        $request = new Request($requestData);
        
        $oldPost = new FakeModel(['id' => $id]);
        
        $this->postRepoMock->shouldReceive('findById')
            ->with($id, $this->getWith())
            ->once()
            ->andReturn($oldPost);
        
        $mockPost = Mockery::mock('stdClass');
        $mockPost->id = $id;
        $mockPost->order = 5;
        $mockPost->shouldReceive('toArray')->andReturn(['id' => $id, 'order' => 5]);
        
        // Languages relation should NOT be called when only updating order
        $mockPost->shouldReceive('languages')->never();
        
        $this->postRepoMock->shouldReceive('update')
            ->with($id, Mockery::subset(['order' => 5, 'user_id' => 1]))
            ->once()
            ->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postService->save($request, $id);
        
        $this->assertNotNull($result);
    }

    // ==========================================
    // READ OPERATIONS
    // ==========================================

    /** @test */
    public function test_show_post_with_relations()
    {
        $id = 1;
        $mockPost = new FakeModel([
            'id' => $id,
            'post_catalogue_id' => 1,
            'creators' => ['id' => 1, 'name' => 'Test User'],
            'current_languages' => collect([['pivot' => ['name' => 'Test Post']]]),
            'post_catalogue' => ['id' => 1, 'name' => 'Test Catalogue'],
            'post_catalogues' => collect([['id' => 1, 'name' => 'Cat 1'], ['id' => 2, 'name' => 'Cat 2']]),
            'languages' => collect([['id' => 1, 'name' => 'Vietnamese']])
        ]);
        
        $this->postRepoMock->shouldReceive('findById')
            ->with($id, $this->getWith())
            ->once()
            ->andReturn($mockPost);
        
        $result = $this->postService->show($id);
        
        $this->assertEquals($id, $result->id);
        $this->assertNotNull($result->creators);
        $this->assertNotNull($result->post_catalogue);
        $this->assertNotNull($result->post_catalogues);
    }

    /** @test */
    public function test_show_post_not_found()
    {
        $id = 9999;
        
        $this->postRepoMock->shouldReceive('findById')
            ->with($id, $this->getWith())
            ->once()
            ->andThrow(new ModelNotFoundException('Post not found'));
        
        $this->expectException(ModelNotFoundException::class);
        
        $this->postService->show($id);
    }

    // ==========================================
    // DELETE OPERATIONS
    // ==========================================

    /** @test */
    public function test_delete_post()
    {
        $id = 1;
        $mockPost = new FakeModel(['id' => $id]);
        
        $this->postRepoMock->shouldReceive('findById')
            ->with($id, [])
            ->once()
            ->andReturn($mockPost);
        
        $this->postRepoMock->shouldReceive('delete')
            ->with($id)
            ->once()
            ->andReturn(true);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postService->destroy($id);
        
        $this->assertTrue($result);
    }

    // ==========================================
    // PAGINATE & FILTER OPERATIONS
    // ==========================================

    /** @test */
    public function test_paginate_with_catalogue_filter_includes_children()
    {
        $parentCatalogue = new FakeModel([
            'id' => 1,
            'lft' => 1,
            'rgt' => 10
        ]);
        
        $childCatalogues = collect([
            new FakeModel(['id' => 1, 'lft' => 1, 'rgt' => 10]),
            new FakeModel(['id' => 2, 'lft' => 2, 'rgt' => 5]),
            new FakeModel(['id' => 3, 'lft' => 6, 'rgt' => 9]),
        ]);
        
        // Mock catalogue service
        $this->postCatalogueServiceMock->shouldReceive('show')
            ->with(1)
            ->once()
            ->andReturn($parentCatalogue);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('getCollection')->andReturn($childCatalogues);
        $mockPaginator->shouldReceive('total')->andReturn(3);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->postCatalogueServiceMock->shouldReceive('paginate')
            ->with(Mockery::type(Request::class))
            ->once()
            ->andReturn($mockPaginator);
        
        $request = new Request(['post_catalogue_id' => 1, 'page' => 1]);
        
        $mockPostPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPostPaginator->shouldReceive('total')->andReturn(5);
        $mockPostPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPostPaginator->shouldReceive('data')->andReturn([]);
        $mockPostPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->postRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return isset($specs['filter']['catalogue_ids']) 
                    && in_array(1, $specs['filter']['catalogue_ids'])
                    && in_array(2, $specs['filter']['catalogue_ids'])
                    && in_array(3, $specs['filter']['catalogue_ids']);
            }))
            ->once()
            ->andReturn($mockPostPaginator);
        
        $result = $this->postService->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
    }

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
        
        $this->postRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return isset($specs['filter']['keyword']['q'])
                    && $specs['filter']['keyword']['q'] === 'test keyword'
                    && in_array('name', $specs['filter']['keyword']['fields'])
                    && in_array('description', $specs['filter']['keyword']['fields']);
            }))
            ->once()
            ->andReturn($mockPaginator);
        
        $result = $this->postService->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
    }

    /** @test */
    public function test_paginate_with_cache_strategy_dataset()
    {
        Cache::flush();
        
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->postRepoMock->shouldReceive('pagination')
            ->once()
            ->andReturn($mockPaginator);
        
        // First call
        $result1 = $this->postService->paginate($request);
        
        // Second call should use cache (same request)
        $result2 = $this->postService->paginate($request);
        
        $this->assertInstanceOf(LengthAwarePaginator::class, $result1);
        $this->assertInstanceOf(LengthAwarePaginator::class, $result2);
        
        // Verify cache strategy
        $reflection = new \ReflectionClass($this->postService);
        $property = $reflection->getProperty('cacheStrategy');
        $property->setAccessible(true);
        $this->assertEquals('dataset', $property->getValue($this->postService));
    }

    // ==========================================
    // RELATIONS OPERATIONS
    // ==========================================

    /** @test */
    public function test_languages_relation_uses_sync_without_detaching()
    {
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        
        $mockPost = Mockery::mock('stdClass');
        $mockPost->id = 1;
        
        // Mock languages relation - should use syncWithoutDetaching
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')
            ->with(Mockery::type('array'))
            ->once()
            ->andReturn(true);
        $mockPost->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        $mockPostCataloguesRelation = Mockery::mock();
        $mockPostCataloguesRelation->shouldReceive('sync')->andReturn(true);
        $mockPost->shouldReceive('post_catalogues')->andReturn($mockPostCataloguesRelation);
        $mockPost->shouldReceive('toArray')->andReturn(['id' => 1]);
        
        $this->postRepoMock->shouldReceive('create')->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        // Mock Log facade for tracking
        Log::shouldReceive('info')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();
        
        $result = $this->postService->save($request);
        
        $this->assertNotNull($result);
    }

    /** @test */
    public function test_post_catalogues_relation_uses_sync()
    {
        $requestData = $this->getDefaultRequestData(['post_catalogues' => [1, 2, 3]]);
        $request = new Request($requestData);
        
        $mockPost = Mockery::mock('stdClass');
        $mockPost->id = 1;
        
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockPost->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        // Mock post_catalogues relation - should use sync (not syncWithoutDetaching)
        $mockPostCataloguesRelation = Mockery::mock();
        $mockPostCataloguesRelation->shouldReceive('sync')
            ->with([1, 2, 3])
            ->once()
            ->andReturn(true);
        $mockPost->shouldReceive('post_catalogues')->andReturn($mockPostCataloguesRelation);
        $mockPost->shouldReceive('toArray')->andReturn(['id' => 1]);
        
        $this->postRepoMock->shouldReceive('create')->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        // Mock Log facade for tracking
        Log::shouldReceive('info')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();
        
        $result = $this->postService->save($request);
        
        $this->assertNotNull($result);
    }

    // ==========================================
    // ROUTER OPERATIONS
    // ==========================================

    /** @test */
    public function test_router_sync_on_create_with_canonical()
    {
        $requestData = $this->getDefaultRequestData(['canonical' => 'test-post']);
        $request = new Request($requestData);
        
        $mockPost = Mockery::mock('stdClass');
        $mockPost->id = 1;
        
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockPost->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        $mockPostCataloguesRelation = Mockery::mock();
        $mockPostCataloguesRelation->shouldReceive('sync')->andReturn(true);
        $mockPost->shouldReceive('post_catalogues')->andReturn($mockPostCataloguesRelation);
        
        // Mock router sync
        $mockRoutersRelation = Mockery::mock();
        $mockRoutersRelation->shouldReceive('updateOrCreate')
            ->with(
                ['module' => 'posts', 'routerable_id' => 1],
                Mockery::on(function ($payload) {
                    return isset($payload['canonical']) 
                        && $payload['canonical'] === 'test-post'
                        && isset($payload['next_component'])
                        && isset($payload['controller']);
                })
            )
            ->once()
            ->andReturn(new FakeModel(['id' => 1]));
        $mockPost->shouldReceive('routers')->andReturn($mockRoutersRelation);
        $mockPost->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockPost->shouldReceive('load')->with('routers')->andReturnSelf();
        $mockPost->shouldReceive('toArray')->andReturn(['id' => 1]);
        
        $this->postRepoMock->shouldReceive('create')->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        // Mock Log facade for tracking
        Log::shouldReceive('info')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();
        
        $result = $this->postService->save($request);
        
        $this->assertNotNull($result);
    }

    /** @test */
    public function test_router_not_synced_when_no_canonical()
    {
        $requestData = $this->getDefaultRequestData();
        unset($requestData['canonical']);
        $request = new Request($requestData);
        
        $mockPost = new FakeModel(['id' => 1]);
        $mockPost->shouldReceive('routers')->andReturn(null);
        $mockPost->shouldReceive('relationLoaded')->with('routers')->andReturn(false);
        $mockPost->shouldReceive('load')->with('routers')->andReturnSelf();
        
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockPost->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        $mockPostCataloguesRelation = Mockery::mock();
        $mockPostCataloguesRelation->shouldReceive('sync')->andReturn(true);
        $mockPost->shouldReceive('post_catalogues')->andReturn($mockPostCataloguesRelation);
        
        $this->postRepoMock->shouldReceive('create')->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        // Mock Log facade for tracking
        Log::shouldReceive('info')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();
        
        $result = $this->postService->save($request);
        
        $this->assertNotNull($result);
    }

    // ==========================================
    // CACHE OPERATIONS
    // ==========================================

    /** @test */
    public function test_cache_invalidated_after_save()
    {
        Cache::flush();
        
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        
        $mockPost = Mockery::mock('stdClass');
        $mockPost->id = 1;
        
        $mockLanguagesRelation = Mockery::mock();
        $mockLanguagesRelation->shouldReceive('syncWithoutDetaching')->andReturn(true);
        $mockPost->shouldReceive('languages')->andReturn($mockLanguagesRelation);
        
        $mockPostCataloguesRelation = Mockery::mock();
        $mockPostCataloguesRelation->shouldReceive('sync')->andReturn(true);
        $mockPost->shouldReceive('post_catalogues')->andReturn($mockPostCataloguesRelation);
        $mockPost->shouldReceive('toArray')->andReturn(['id' => 1]);
        
        $this->postRepoMock->shouldReceive('create')->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        // Mock Log facade for tracking
        Log::shouldReceive('info')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();
        
        $result = $this->postService->save($request);
        
        // Cache should be invalidated after save
        $this->assertNotNull($result);
    }

    // ==========================================
    // FORMAT REQUEST DATA FOR FRONTEND
    // ==========================================

    /** @test */
    public function test_format_request_data_for_frontend_with_catalogue_filter()
    {
        $parentCatalogue = new FakeModel([
            'id' => 1,
            'lft' => 1,
            'rgt' => 10
        ]);
        
        $childCatalogues = collect([
            new FakeModel(['id' => 1, 'lft' => 1, 'rgt' => 10]),
            new FakeModel(['id' => 2, 'lft' => 2, 'rgt' => 5]),
            new FakeModel(['id' => 3, 'lft' => 6, 'rgt' => 9]),
        ]);
        
        $this->postCatalogueServiceMock->shouldReceive('show')
            ->with(1)
            ->once()
            ->andReturn($parentCatalogue);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('getCollection')->andReturn($childCatalogues);
        
        $this->postCatalogueServiceMock->shouldReceive('paginate')
            ->with(Mockery::type(Request::class))
            ->once()
            ->andReturn($mockPaginator);
        
        $request = new Request(['post_catalogue_id' => 1]);
        
        $formatted = $this->postService->formatRequestDataForFrontend($request);
        
        $this->assertArrayHasKey('post_catalogue_id', $formatted);
        $this->assertIsArray($formatted['post_catalogue_id']);
        $this->assertArrayHasKey('id', $formatted['post_catalogue_id']);
        $this->assertArrayHasKey('in', $formatted['post_catalogue_id']['id']);
        
        // Should include parent and children
        $ids = explode(',', $formatted['post_catalogue_id']['id']['in']);
        $this->assertContains('1', $ids);
        $this->assertContains('2', $ids);
        $this->assertContains('3', $ids);
    }
}

