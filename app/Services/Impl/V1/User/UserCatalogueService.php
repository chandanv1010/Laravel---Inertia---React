<?php  
namespace App\Services\Impl\V1\User;
use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\User\UserCatalogueServiceInterface;
use App\Repositories\User\UserCatalogueRepo;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class UserCatalogueService extends BaseService implements UserCatalogueServiceInterface {

    protected $repository;

    protected $with = ['users', 'creators', 'permissions'];
    protected $simpleFilter = ['publish'];
    protected $searchFields = ['name', 'canonical', 'description'];


    // protected $perpage = ;

    public function __construct(
        UserCatalogueRepo $repository
    )
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        if(isset($this->modelData['canonical'])){
            $this->modelData['canonical'] = Str::slug($this->modelData['canonical']); 
        }
        $this->modelData['user_id'] = Auth::id();
        return $this;
    }

}
