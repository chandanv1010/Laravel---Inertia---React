<?php  
namespace App\Services\Impl\V1\User;
use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\User\UserServiceInterface;
use App\Repositories\User\UserRepo;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class UserService extends BaseService implements UserServiceInterface {

    protected $repository;

    // protected $simpleFilter = ['publish'];
    protected $searchFields = ['name', 'phone', 'email', 'description'];
    protected $with = ['user_catalogues', 'creators'];
    protected $withFilters = ['user_catalogues'];

    public function __construct(
        UserRepo $repository
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

    public function getDropdown()
    {
        $request = new Request([
            'type' => 'all',
            'publish' => '2',
            'sort' => 'name,asc'
        ]);
        $records = $this->paginate($request);
        
        return $records->map(function($record) {
            return [
                'value' => $record->id,
                'label' => $record->name ?: $record->email,
            ];
        })->toArray();
    }

}
