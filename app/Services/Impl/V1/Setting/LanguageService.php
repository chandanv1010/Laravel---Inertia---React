<?php  
namespace App\Services\Impl\V1\Setting;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Setting\LanguageServiceInterface;
use App\Repositories\Setting\LanguageRepo;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class LanguageService extends BaseCacheService implements LanguageServiceInterface {

    protected $repository;

    // Cache strategy: 'cache_all' phù hợp cho languages vì ít thay đổi và cần cache lâu dài
    protected string $cacheStrategy = 'cache_all';
    protected string $module = 'languages';

    protected $with = ['creators'];
    protected $simpleFilter = ['publish'];
    protected $searchFields = ['name', 'description'];

    public function __construct(
        LanguageRepo $repository
    )
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        return $this;
    }

}
