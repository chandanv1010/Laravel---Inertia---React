<?php

namespace Tests\Feature\Services\Log;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log as LogFacade;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Services\Impl\V1\Log\LogService;
use App\Repositories\Log\LogRepo;
use App\Models\Log;
use Tests\Fakes\FakeModel;
use Carbon\Carbon;

class LogServiceTest extends TestCase
{
    protected $logService;
    protected $logRepoMock;
    protected $mockLogModel;
    protected $mockUser;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Clear cache
        Cache::flush();
        
        // Setup config
        config([
            'cache_modules.enabled' => true,
            'cache_modules.ttl_paginate.hot_queries' => 600,
            'tracking.enabled' => true,
        ]);
        
        // Mock repository
        $this->logRepoMock = Mockery::mock(LogRepo::class);
        
        // Mock Log model
        $this->mockLogModel = Mockery::mock(Log::class);
        $this->mockLogModel->shouldReceive('getTable')->andReturn('logs');
        $this->logRepoMock->shouldReceive('getModel')->andReturn($this->mockLogModel);
        
        // Mock user
        $this->mockUser = (object)['id' => 1, 'email' => 'test@example.com'];
        Auth::shouldReceive('user')->andReturn($this->mockUser);
        Auth::shouldReceive('id')->andReturn($this->mockUser->id);
        
        // Create service instance
        $this->logService = new LogService($this->logRepoMock);
    }

    protected function tearDown(): void
    {
        Cache::flush();
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function test_log_action_success()
    {
        // Arrange
        $action = 'create';
        $module = 'post';
        $record = (object)['id' => 1, 'name' => 'Test Post'];
        $data = ['description' => 'Test description'];
        
        $mockRequest = Mockery::mock(Request::class)->makePartial();
        $mockRequest->shouldReceive('ip')->andReturn('127.0.0.1');
        $mockRequest->shouldReceive('userAgent')->andReturn('Test User Agent');
        $mockRoute = (object)['getName' => fn() => 'post.store'];
        $mockRequest->shouldReceive('route')->andReturn($mockRoute);
        $mockRequest->shouldReceive('method')->andReturn('POST');
        $mockRequest->shouldReceive('setUserResolver')->andReturnSelf();
        
        // Mock request() helper
        app()->instance('request', $mockRequest);
        
        // Create a mock log object - need to handle $result?->id in LogService line 96
        // Use FakeModel which properly handles attribute access
        $mockLog = new FakeModel(['id' => 1]);
        
        $this->logRepoMock->shouldReceive('create')
            ->with(Mockery::on(function ($arg) {
                return $arg['action'] === 'create' 
                    && $arg['module'] === 'post'
                    && $arg['user_id'] === 1
                    && $arg['ip_address'] === '127.0.0.1';
            }))
            ->once()
            ->andReturn($mockLog);
        
        // LogService calls LogFacade::info() twice: before and after create
        // Also allow error() in case something goes wrong
        LogFacade::shouldReceive('info')->twice();
        LogFacade::shouldReceive('error')->zeroOrMoreTimes();
        
        // Act
        $result = $this->logService->log($action, $module, $record, $data);
        
        // Assert
        $this->assertTrue($result);
    }

    /** @test */
    public function test_log_action_without_record()
    {
        // Arrange
        $action = 'view';
        $module = 'dashboard';
        $record = null;
        $data = [];
        
        $mockRequest = Mockery::mock(Request::class)->makePartial();
        $mockRequest->shouldReceive('ip')->andReturn('127.0.0.1');
        $mockRequest->shouldReceive('userAgent')->andReturn('Test User Agent');
        $mockRequest->shouldReceive('route')->andReturn(null);
        $mockRequest->shouldReceive('method')->andReturn('GET');
        $mockRequest->shouldReceive('setUserResolver')->andReturnSelf();
        
        app()->instance('request', $mockRequest);
        
        $mockLog = new FakeModel(['id' => 1]);
        
        $this->logRepoMock->shouldReceive('create')
            ->with(Mockery::on(function ($arg) {
                return $arg['action'] === 'view' 
                    && $arg['module'] === 'dashboard'
                    && !isset($arg['record_id']);
            }))
            ->once()
            ->andReturn($mockLog);
        
        LogFacade::shouldReceive('info')->twice(); // Called twice in LogService::log()
        LogFacade::shouldReceive('error')->never(); // Should not be called on success
        
        // Act
        $result = $this->logService->log($action, $module, $record, $data);
        
        // Assert
        $this->assertTrue($result);
    }

    /** @test */
    public function test_log_action_with_filter_params()
    {
        // Arrange
        $action = 'view';
        $module = 'post';
        $record = null;
        $data = [
            'filter_params' => ['publish' => '2'],
            'search' => 'test',
            'sort' => 'name,asc',
            'page' => 1,
        ];
        
        $mockRequest = Mockery::mock(Request::class)->makePartial();
        $mockRequest->shouldReceive('ip')->andReturn('127.0.0.1');
        $mockRequest->shouldReceive('userAgent')->andReturn('Test User Agent');
        $mockRequest->shouldReceive('route')->andReturn(null);
        $mockRequest->shouldReceive('method')->andReturn('GET');
        $mockRequest->shouldReceive('setUserResolver')->andReturnSelf();
        
        app()->instance('request', $mockRequest);
        
        $mockLog = new FakeModel(['id' => 1]);
        
        $this->logRepoMock->shouldReceive('create')
            ->with(Mockery::on(function ($arg) {
                return isset($arg['changes']['filters'])
                    && isset($arg['changes']['search'])
                    && isset($arg['changes']['sort']);
            }))
            ->once()
            ->andReturn($mockLog);
        
        LogFacade::shouldReceive('info')->twice(); // Called twice in LogService::log()
        LogFacade::shouldReceive('error')->never(); // Should not be called on success
        
        // Act
        $result = $this->logService->log($action, $module, $record, $data);
        
        // Assert
        $this->assertTrue($result);
    }

    /** @test */
    public function test_log_action_when_tracking_disabled()
    {
        // Arrange
        config(['tracking.enabled' => false]);
        
        // Act
        $result = $this->logService->log('create', 'post', null, []);
        
        // Assert
        $this->assertFalse($result);
    }

    /** @test */
    public function test_log_action_handles_exception_gracefully()
    {
        // Arrange
        $action = 'create';
        $module = 'post';
        
        $mockRequest = Mockery::mock(Request::class)->makePartial();
        $mockRequest->shouldReceive('ip')->andReturn('127.0.0.1');
        $mockRequest->shouldReceive('userAgent')->andReturn('Test User Agent');
        $mockRequest->shouldReceive('route')->andReturn(null);
        $mockRequest->shouldReceive('method')->andReturn('POST');
        $mockRequest->shouldReceive('setUserResolver')->andReturnSelf();
        
        app()->instance('request', $mockRequest);
        
        $this->logRepoMock->shouldReceive('create')
            ->once()
            ->andThrow(new \Exception('Database error'));
        
        LogFacade::shouldReceive('info')->once();
        LogFacade::shouldReceive('error')
            ->once()
            ->with('Failed to log action', Mockery::type('array'));
        
        // Act
        $result = $this->logService->log($action, $module, null, []);
        
        // Assert
        $this->assertFalse($result);
    }

    /** @test */
    public function test_delete_older_than_months()
    {
        // Arrange
        $months = 6;
        
        $mockQuery = Mockery::mock();
        $mockQuery->shouldReceive('where')
            ->with('created_at', '<', Mockery::type(Carbon::class))
            ->once()
            ->andReturnSelf();
        
        $mockQuery->shouldReceive('delete')
            ->once()
            ->andReturn(5);
        
        DB::shouldReceive('table')
            ->with('logs')
            ->once()
            ->andReturn($mockQuery);
        
        // Act
        $result = $this->logService->deleteOlderThan($months);
        
        // Assert
        $this->assertEquals(5, $result);
    }

    /** @test */
    public function test_delete_last_n_days()
    {
        // Arrange
        $days = 7;
        
        $mockQuery = Mockery::mock();
        $mockQuery->shouldReceive('where')
            ->with('created_at', '>=', Mockery::type(Carbon::class))
            ->once()
            ->andReturnSelf();
        
        $mockQuery->shouldReceive('delete')
            ->once()
            ->andReturn(10);
        
        DB::shouldReceive('table')
            ->with('logs')
            ->once()
            ->andReturn($mockQuery);
        
        // Act
        $result = $this->logService->deleteLastNDays($days);
        
        // Assert
        $this->assertEquals(10, $result);
    }

    /** @test */
    public function test_paginate_with_date_filter()
    {
        // Arrange
        $request = new Request([
            'created_at' => [
                'between' => '2025-01-01,2025-01-31'
            ],
            'page' => 1,
            'perpage' => 20,
        ]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(5);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->logRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return isset($specs['filter']['date']['created_at']['between'])
                    && $specs['filter']['date']['created_at']['between'] === '2025-01-01,2025-01-31';
            }))
            ->once()
            ->andReturn($mockPaginator);
        
        // Act
        $result = $this->logService->paginate($request);
        
        // Assert
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
        $this->assertEquals(5, $result->total());
        $this->assertEquals(20, $result->per_page());
    }

    /** @test */
    public function test_paginate_with_simple_filters()
    {
        // Arrange
        $request = new Request([
            'status' => 'success',
            'action' => 'create',
            'module' => 'post',
            'user_id' => 1,
            'page' => 1,
        ]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->logRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return isset($specs['filter']['simple']['status'])
                    && $specs['filter']['simple']['status'] === 'success'
                    && isset($specs['filter']['simple']['action'])
                    && $specs['filter']['simple']['action'] === 'create';
            }))
            ->once()
            ->andReturn($mockPaginator);
        
        // Act
        $result = $this->logService->paginate($request);
        
        // Assert
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
    }

    /** @test */
    public function test_paginate_with_search_keyword()
    {
        // Arrange
        $request = new Request([
            'keyword' => 'test description',
            'page' => 1,
        ]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(3);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->logRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return isset($specs['filter']['keyword']['q'])
                    && $specs['filter']['keyword']['q'] === 'test description'
                    && in_array('description', $specs['filter']['keyword']['fields'])
                    && in_array('module', $specs['filter']['keyword']['fields'])
                    && in_array('action', $specs['filter']['keyword']['fields']);
            }))
            ->once()
            ->andReturn($mockPaginator);
        
        // Act
        $result = $this->logService->paginate($request);
        
        // Assert
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
    }

    /** @test */
    public function test_paginate_with_sort()
    {
        // Arrange
        $request = new Request([
            'sort' => 'created_at,asc',
            'page' => 1,
        ]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->logRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return $specs['sort'] === ['created_at', 'asc'];
            }))
            ->once()
            ->andReturn($mockPaginator);
        
        // Act
        $result = $this->logService->paginate($request);
        
        // Assert
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
    }

    /** @test */
    public function test_paginate_default_sort_is_id_desc()
    {
        // Arrange
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->logRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return $specs['sort'] === ['id', 'desc'];
            }))
            ->once()
            ->andReturn($mockPaginator);
        
        // Act
        $result = $this->logService->paginate($request);
        
        // Assert
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
    }

    /** @test */
    public function test_paginate_with_relations()
    {
        // Arrange
        $request = new Request(['page' => 1]);
        
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(10);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);
        $mockPaginator->shouldReceive('withQueryString')->andReturnSelf();
        
        $this->logRepoMock->shouldReceive('pagination')
            ->with(Mockery::on(function ($specs) {
                return in_array('user', $specs['with']);
            }))
            ->once()
            ->andReturn($mockPaginator);
        
        // Act
        $result = $this->logService->paginate($request);
        
        // Assert
        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
    }
}

