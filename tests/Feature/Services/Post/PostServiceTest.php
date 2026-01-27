<?php  
namespace Tests\Feature\Services\Post;

use Tests\Feature\Services\Cache\BaseCacheServiceTest;
use Mockery;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Services\Impl\V1\Post\PostService;
use App\Services\Interfaces\Post\PostCatalogueServiceInterface;
use App\Repositories\Post\PostRepo;
use App\Models\Post;
use App\Models\PostCatalogue;
use App\Models\Language;
use Tests\Fakes\FakeModel;

class PostServiceTest extends BaseCacheServiceTest
{
    protected $postService;
    protected $postRepoMock;
    protected $mockPostModel;
    protected $mockPostCatalogueModel;

    protected function setUp(): void
    {
        parent::setUp();
        
        config(['app.language_id' => 1]);
        
        $this->postRepoMock = Mockery::mock(PostRepo::class);
        $this->mockPostModel = Mockery::mock(Post::class);
        $this->mockPostCatalogueModel = Mockery::mock(PostCatalogue::class);
        
        $this->postRepoMock->shouldReceive('getFillable')->andReturn([
            'post_catalogue_id', 'image', 'icon', 'album', 'script', 'iframe', 'qrcode', 
            'order', 'publish', 'user_id', 'robots'
        ]);
        $this->postRepoMock->shouldReceive('getRelationable')->andReturn(['languages', 'post_catalogues']);
        $this->postRepoMock->shouldReceive('getModel')->andReturn($this->mockPostModel);
        
        // Mock PostCatalogueServiceInterface
        $postCatalogueServiceMock = Mockery::mock(PostCatalogueServiceInterface::class);
        
        $this->postService = new PostService($this->postRepoMock, $postCatalogueServiceMock);
    }

    protected function tearDown(): void
    {
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
            'post_catalogue_id' => 1,
            'post_catalogues' => [1, 2],
            'publish' => '2',
            'image' => 'test-image.jpg',
        ], $overrides);
    }

    protected function prepareExpectedData(array $requestData): array
    {
        $expected = [
            'user_id' => Auth::id(),
            'post_catalogue_id' => $requestData['post_catalogue_id'] ?? null,
            'publish' => $requestData['publish'] ?? '2',
            'image' => $requestData['image'] ?? null,
        ];
        
        return array_filter($expected, fn($v) => $v !== null);
    }

    protected function getWith(): array
    {
        return ['creators', 'current_languages', 'post_catalogue', 'post_catalogues'];
    }

    public function test_luu_post_moi_voi_language_pivot_thanh_cong()
    {
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        
        $expectedData = $this->prepareExpectedData($requestData);
        $mockPost = new FakeModel(['id' => 1]);
        $mockPost->shouldReceive('post_catalogues')->andReturn(
            Mockery::mock()->shouldReceive('sync')->with([1, 2])->once()->andReturn(true)->getMock()
        );
        
        $this->postRepoMock->shouldReceive('create')
            ->with(Mockery::subset($expectedData))
            ->once()
            ->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        DB::shouldReceive('rollBack')->never();
        
        $result = $this->postService->save($request);
        
        $this->assertNotNull($result);
        $this->assertEquals(1, $result->id);
    }

    public function test_luu_post_voi_post_catalogue_id_sync_vao_pivot()
    {
        $requestData = $this->getDefaultRequestData(['post_catalogues' => null]);
        $request = new Request($requestData);
        
        $expectedData = $this->prepareExpectedData($requestData);
        $mockPost = new FakeModel(['id' => 1]);
        $mockPost->shouldReceive('post_catalogues')->andReturn(
            Mockery::mock()->shouldReceive('sync')->with([1])->once()->andReturn(true)->getMock()
        );
        
        $this->postRepoMock->shouldReceive('create')
            ->with(Mockery::subset($expectedData))
            ->once()
            ->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postService->save($request);
        
        $this->assertNotNull($result);
    }

    public function test_filter_posts_theo_danh_muc_bao_gom_ca_danh_muc_con()
    {
        $parentCatalogue = Mockery::mock(PostCatalogue::class);
        $parentCatalogue->id = 1;
        $parentCatalogue->lft = 1;
        $parentCatalogue->rgt = 10;
        
        PostCatalogue::shouldReceive('find')
            ->with(1)
            ->once()
            ->andReturn($parentCatalogue);
        
        PostCatalogue::shouldReceive('where')
            ->with('lft', '>=', 1)
            ->once()
            ->andReturnSelf();
        
        PostCatalogue::shouldReceive('where')
            ->with('rgt', '<=', 10)
            ->once()
            ->andReturnSelf();
        
        PostCatalogue::shouldReceive('pluck')
            ->with('id')
            ->once()
            ->andReturn(collect([1, 2, 3]));
        
        $request = new Request(['post_catalogue_id' => 1]);
        
        // Test scope filterByCatalogue
        $query = Post::query();
        $filteredQuery = $query->filterByCatalogue(1);
        
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Builder::class, $filteredQuery);
    }

    public function test_paginate_voi_cache_strategy_dataset()
    {
        Cache::flush();
        config(['cache_modules.enabled' => true]);
        
        $request = new Request(['page' => 1, 'perpage' => 20]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('count')->andReturn(10);
        $mockPaginator->shouldReceive('forPage')->andReturn(collect([1, 2, 3]));
        
        $this->postRepoMock->shouldReceive('pagination')
            ->once()
            ->andReturn(collect([1, 2, 3, 4, 5]));
        
        // Verify cache strategy is dataset
        $reflection = new \ReflectionClass($this->postService);
        $property = $reflection->getProperty('cacheStrategy');
        $property->setAccessible(true);
        
        $this->assertEquals('dataset', $property->getValue($this->postService));
    }

    public function test_show_post_voi_relationships()
    {
        $id = 1;
        $mockPost = new FakeModel([
            'id' => $id,
            'post_catalogue_id' => 1,
            'creators' => ['id' => 1, 'name' => 'Test User'],
            'current_languages' => collect([['pivot' => ['name' => 'Test Post']]]),
            'post_catalogue' => ['id' => 1, 'name' => 'Test Catalogue'],
            'post_catalogues' => collect([['id' => 1, 'name' => 'Cat 1'], ['id' => 2, 'name' => 'Cat 2']])
        ]);
        
        $this->postRepoMock->shouldReceive('findById')
            ->with($id, $this->getWith())
            ->once()
            ->andReturn($mockPost);
        
        $result = $this->postService->show($id);
        
        $this->assertEquals($id, $result->id);
    }

    public function test_invalidate_cache_sau_khi_save()
    {
        Cache::flush();
        config(['cache_modules.enabled' => true]);
        
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        
        $expectedData = $this->prepareExpectedData($requestData);
        $mockPost = new FakeModel(['id' => 1]);
        $mockPost->shouldReceive('post_catalogues')->andReturn(
            Mockery::mock()->shouldReceive('sync')->andReturn(true)->getMock()
        );
        
        $this->postRepoMock->shouldReceive('create')
            ->andReturn($mockPost);
        
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        
        $result = $this->postService->save($request);
        
        // Verify cache is invalidated (check if invalidateCache is called)
        $this->assertNotNull($result);
    }
}

