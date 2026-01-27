<?php  
namespace Tests\Feature\Services;
use Tests\TestCase;
use Mockery;
use Mockery\MockInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Model;
use Tests\Fakes\FakeModel;
use Throwable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;

abstract class BaseServiceTest extends TestCase {

    protected $service;
    protected MockInterface $repositoryMock;
    protected $fakeAuth;


    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeAuth = (object)['id' => 1];
        Auth::shouldReceive('id')->andReturn($this->fakeAuth->id);

        /** Mock DB */
        // DB::shouldReceive('beginTransaction')->andReturn(true);
        // DB::shouldReceive('commit')->andReturn(true);
        // DB::shouldReceive('rollBack')->andReturn(true);

    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_luu_ban_ghi_moi_thanh_cong(){
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        $expectedData = $this->prepareExpectedData($requestData);
        $this->repositoryMock->shouldReceive('getFillable')->andReturn(array_keys($expectedData));
        $this->repositoryMock->shouldReceive('getRelationable')->andReturn([]);
        $mockModel = new FakeModel(['id' => 1]);
        $this->repositoryMock->shouldReceive('create')->with(Mockery::subset($expectedData))->andReturn($mockModel);
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        DB::shouldReceive('rollBack')->never();

        $result = $this->service->save($request);
        $this->assertEquals(1, $result->id);
    }

    public function test_luu_ban_ghi_that_bai_khi_repository_throws_exception(){
        $requestData = $this->getDefaultRequestData();
        $request = new Request($requestData);
        $expectedData = $this->prepareExpectedData($requestData);

        $this->repositoryMock->shouldReceive('getFillable')->andReturn(array_keys($expectedData));
        $this->repositoryMock->shouldReceive('getRelationable')->andReturn([]);
        $this->repositoryMock->shouldReceive('create')->andThrow(new \Exception('Database Error'));
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->never();
        DB::shouldReceive('rollBack')->once();
        $result = $this->service->save($request);
        $this->assertFalse($result, 'Khi Repository ném Exception, thì phương thức save phải trả về false');
    }

    public function test_luu_ban_ghi_that_bai_khi_du_lieu_rong(){
        $request = new Request([]);
        $this->repositoryMock->shouldReceive('getFillable')->andReturn(array_keys(['name']));
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->never();
        DB::shouldReceive('rollBack')->once();
        $result = $this->service->save($request);
        $this->assertFalse($result, 'Khi Dữ liệu đầu vào rỗng, thì phương thức save phải trả về false');
    }

    /** TEST CASE LƯU DỮ LIỆU THÀNH CÔNG VỚI QUAN HỆ */


    /** TEST CASE LƯU DỮ LIỆU KHÔNG THÀNH CÔNG VỚI QUAN HỆ */

    public function test_cap_nhat_ban_ghi_thanh_cong(){
        $id = 1;
        $requestData = $this->getDefaultRequestData(['name' => 'Updated']);
        $request = new Request($requestData);
        $expectedData = $this->prepareExpectedData($requestData);
        $this->repositoryMock->shouldReceive('getFillable')->andReturn(array_keys($expectedData));
        $this->repositoryMock->shouldReceive('getRelationable')->andReturn([]);
        $mockModel = new FakeModel(['id' => 1]);
        $this->repositoryMock->shouldReceive('update')->with($id, Mockery::subset($expectedData))->andReturn($mockModel);

        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('commit')->once();
        DB::shouldReceive('rollBack')->never();

        $result = $this->service->save($request, $id);
        $this->assertEquals(1, $result->id);
    }

    public function test_hien_thi_du_lieu_theo_id_voi_quan_he_thanh_cong(){
        $id = 1;
        $mockModel = new FakeModel(['id' => $id, 'name' => 'Test', 'users' => [], 'creators' => []]);
        $this->repositoryMock->shouldReceive('findById')->with($id, $this->getWith())->andReturn($mockModel);

        $result = $this->service->show($id);
        $this->assertEquals($id, $result->id);
        $this->assertIsArray($result->users);
        $this->assertIsArray($result->creators);

    }

    public function test_hien_thi_du_lieu_that_bai_khi_id_khong_ton_tai(){
        $id = 9999;
        $this->repositoryMock->shouldReceive('findById')->with($id, $this->getWith())->andThrow(new ModelNotFoundException('Model NotFound'));
        $this->expectException(ModelNotFoundException::class);
        $this->service->show($id);
    }

    public function test_phan_trang_voi_thiet_lap_mac_dinh_thanh_cong(){
        $request = new Request();
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(0);
        $mockPaginator->shouldReceive('per_page')->andReturn(20);
        $mockPaginator->shouldReceive('data')->andReturn([]);

        $this->repositoryMock->shouldReceive('pagination')->with(Mockery::type('array'))->andReturn($mockPaginator);
        $result = $this->service->paginate($request);

        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
        $this->assertEquals(0, $result->total());
        $this->assertEquals(20, $result->per_page());
        $this->assertEmpty($result->data());
    }

    public function test_phan_trang_voi_bo_loc_va_sap_xep(){
        $requestData = [
            'keyword' => 'test',
            'publish' => 1,
            'sort' => 'name,asc',
            'perpage' => 10
        ];

        $request = new Request($requestData);
        $mockPaginator = Mockery::mock(LengthAwarePaginator::class);
        $mockPaginator->shouldReceive('total')->andReturn(5);
        $mockPaginator->shouldReceive('per_page')->andReturn(10);
        $mockPaginator->shouldReceive('data')->andReturn([]);

        $this->repositoryMock->shouldReceive('pagination')->with(Mockery::type('array'))->andReturn($mockPaginator);
        $result = $this->service->paginate($request);

        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
        $this->assertEquals(5, $result->total());
        $this->assertEquals(10, $result->per_page());
        $this->assertEmpty($result->data());
    }

    protected abstract function getDefaultRequestData(array $overrides = []): array;
    protected abstract function prepareExpectedData(array $requestData): array;
    protected abstract function getWith(): array;
}