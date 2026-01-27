<?php  
namespace App\Services\Impl\V1\Router;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Router\RouterServiceInterface;
use App\Repositories\Core\RouterRepo;
use Illuminate\Http\Request;

class RouterService extends BaseCacheService implements RouterServiceInterface {

    protected string $cacheStrategy = 'default';
    protected string $module = 'routers';

    protected $repository;

    protected $with = ['routerable'];
    protected $simpleFilter = ['module', 'language_id'];
    // complexFilter: routerable_id[id][in] và canonical sẽ được xử lý bởi keyword search
    protected $complexFilter = ['routerable_id'];
    protected $searchFields = ['canonical', 'module'];
    protected $sort = ['id', 'desc'];

    public function __construct(RouterRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static
    {
        // Router không có save method, chỉ read-only
        return $this;
    }
}
