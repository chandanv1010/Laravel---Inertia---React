<?php  
namespace Tests\Feature\Services\User;
use Tests\Feature\Services\BaseServiceTest;
use App\Repositories\User\UserCatalogueRepo;
use Mockery;
use App\Services\Interfaces\User\UserCatalogueServiceInterface as UserCatalogueService;
use Illuminate\Support\Str;

class UserCatalogueServiceTest extends BaseServiceTest {


    protected function setUp(): void
    {
        parent::setUp();
        $this->repositoryMock = Mockery::mock(UserCatalogueRepo::class);
        $this->app->instance(UserCatalogueRepo::class, $this->repositoryMock);
        $this->service = $this->app->make(UserCatalogueService::class);
    }

    protected function getDefaultRequestData(array $overrides = []): array {
        return array_merge([
            'name' => 'Test Catalogue',
            'canonical' => 'test-catalogue-canonical',
            'description' => 'Test Description',
            'publish' => 1
        ], $overrides);
    }

    protected function prepareExpectedData(array $requestData): array {
        return [
            'name' => $requestData['name'],
            'canonical' => Str::slug($requestData['canonical']),
            'description' => $requestData['description'],
            'publish' => $requestData['publish'],
            'user_id' => $this->fakeAuth->id,
        ];
    }

    protected function getWith(): array {
        return ['users', 'creators'];
    }


}