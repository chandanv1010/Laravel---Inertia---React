<?php

namespace App\Services\Impl\V1\Warehouse;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface;
use App\Repositories\Warehouse\WarehouseRepo;
use App\Helpers\DropdownHelper;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class WarehouseService extends BaseCacheService implements WarehouseServiceInterface {

    // Cache strategy: 'default' phù hợp cho warehouses vì ít thay đổi
    protected string $cacheStrategy = 'default';
    protected string $module = 'warehouses';

    protected $repository;

    protected $with = ['creators'];
    protected $simpleFilter = ['publish', 'user_id'];
    protected $searchFields = ['name', 'code', 'address', 'manager'];
    protected $sort = ['id', 'desc'];

    public function __construct(
        WarehouseRepo $repository
    )
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        if(isset($this->modelData['code'])){
             $this->modelData['code'] = strtoupper($this->modelData['code']);
        }
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
        return DropdownHelper::transform($records, [
            'valueKey' => 'id',
            'labelKey' => 'name',
            'isMultipleLanguage' => false,
        ]);
    }

    protected function beforeDelete($id): static
    {
        // Load model nếu chưa có
        if(!$this->model){
            $this->findById($id);
        }
        
        // Kiểm tra nếu là kho mặc định (code = 'MAIN') thì không cho xóa
        if($this->model && $this->model->code === 'MAIN'){
            throw new \Exception('Không thể xóa kho mặc định của hệ thống');
        }
        
        return $this;
    }

    public function beforeBulkDestroy(): static
    {
        $ids = $this->request->input('ids', []);
        
        // Kiểm tra xem có kho mặc định trong danh sách xóa không
        $model = $this->repository->getModel();
        $defaultWarehouses = $model->whereIn('id', $ids)
            ->where('code', 'MAIN')
            ->get();
        
        if($defaultWarehouses->count() > 0){
            throw new \Exception('Không thể xóa kho mặc định của hệ thống');
        }
        
        return $this;
    }

    /**
     * Get default warehouse ID (chi nhánh chính - code MAIN)
     * 
     * @return int|null
     */
    public function getDefaultWarehouseId(): ?int
    {
        // Lấy warehouse có code MAIN (chi nhánh chính)
        $warehouse = $this->repository->getModel()
            ->where('code', 'MAIN')
            ->where('publish', '2')
            ->first();

        if ($warehouse) {
            return $warehouse->id;
        }

        // Fallback: lấy warehouse đầu tiên
        $warehouse = $this->repository->getModel()
            ->where('publish', '2')
            ->orderBy('id')
            ->first();

        return $warehouse ? $warehouse->id : null;
    }

}
