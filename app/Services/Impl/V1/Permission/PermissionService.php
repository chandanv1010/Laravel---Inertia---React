<?php  
namespace App\Services\Impl\V1\Permission;
use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\Permission\PermissionServiceInterface;
use App\Repositories\Permission\PermissionRepo;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class PermissionService extends BaseService implements PermissionServiceInterface {

    protected $repository;

    protected $with = ['creators'];
    protected $simpleFilter = ['publish'];
    protected $searchFields = ['name', 'description'];


    // protected $perpage = ;

    public function __construct(
        PermissionRepo $repository
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
