<?php  
namespace App\Services\Impl\V1;

use App\Services\Interfaces\BaseServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Traits\HasTransaction;
use App\Traits\HasSpecBuilder;
use App\Traits\HasTracking;
use Illuminate\Support\Facades\Log;

abstract class BaseService implements BaseServiceInterface{

    use HasTransaction, HasSpecBuilder, HasTracking;

    protected $repository;
    protected $request;
    protected $modelData;
    protected $model;
    protected $result;
    protected $with = [];

    protected $perpage = 20;
    protected $simpleFilter = ['publish'];
    protected $complexFilter = ['id'];
    protected $dateFilter = ['created_at', 'updated'];
    protected $searchFields = ['name'];
    protected $withFilters = [];
    protected $sort = ['id', 'desc'];


    /** SKIP */
    protected bool $skipAfterSave = false;
    protected bool $skipWithRelation = false;
    protected bool $skipBeforeSave = false;

    public function __construct(
        $repository
    )
    {
        $this->repository = $repository;
    }

    protected abstract function prepareModelData(): static;

    protected function setRequest($request): static{
        $this->request = $request;
        return $this;
    }

    public function skipAfterSave(bool $skip = true): static{
        $this->skipAfterSave = $skip;
        return $this;
    }

    public function skipWithRelation(bool $skip = true): static{
        $this->skipWithRelation = $skip;
        return $this;
    }

    public function skipBeforeSave(bool $skip = true): static{
        $this->skipBeforeSave = $skip;
        return $this;
    }

   

    public function save(Request $request, ?int $id = null){
        $isCreate = is_null($id);
        $oldData = null;
        $changes = [];
        $module = $this->getModuleName();

        try {
            // Lấy dữ liệu cũ nếu đang update (để tracking)
            if (!$isCreate) {
                $oldRecord = $this->repository->findById($id, $this->with);
                $oldData = $oldRecord ? $oldRecord->toArray() : [];
            }

            $result = $this->beginTransaction()
                ->setRequest($request)
                ->prepareModelData()
                ->unless($this->skipBeforeSave, fn($c) => $c->beforeSave())
                ->saveModel($id)
                ->unless($this->skipWithRelation, fn($c) => $c->withRelation())
                ->unless($this->skipAfterSave, fn($c) => $c->afterSave())
                ->commit()
                ->getResult();

            // Track action sau khi commit thành công
            if ($result) {
                // Tính toán changes cho update
                if (!$isCreate && $oldData && $this->model) {
                    $newData = $this->model->toArray();
                    $changes = $this->calculateChanges($oldData, $newData);
                }

                // Track action
                if ($isCreate) {
                    $this->trackCreate($module, $this->model ?? $result);
                } else {
                    $this->trackUpdate($module, $this->model ?? $result, $oldData, $changes);
                }
            }

            return $result;
        } catch (\Throwable $th) {
            
            Log::error('SERVER SAVE FAILED: ', [
                'service' => static::class,
                'message' => $th->getMessage(),
                'file' => $th->getFile(),
                'line' => $th->getLine(),
                // 'trace' => $th->getTraceAsString()
            ]);

            // Track failed action
            $this->trackFailed($isCreate ? 'create' : 'update', $module, $oldData ? ['id' => $id] : null, $th->getMessage());

            $this->rollback();
            return false;
        }
    }

    /**
     * Get module name from service class
     */
    protected function getModuleName(): string
    {
        // Extract module name from class name (e.g., PostService -> post)
        $className = class_basename(static::class);
        $moduleName = str_replace('Service', '', $className);
        return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $moduleName));
    }

    /**
     * Calculate changes between old and new data
     */
    protected function calculateChanges(array $oldData, array $newData): array
    {
        $changes = [];
        
        foreach ($newData as $key => $newValue) {
            $oldValue = $oldData[$key] ?? null;
            
            // Skip timestamps and IDs
            if (in_array($key, ['id', 'created_at', 'updated_at', 'deleted_at'])) {
                continue;
            }

            // Compare values (handle arrays and objects)
            if ($this->isValueChanged($oldValue, $newValue)) {
                $changes[$key] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }

        return $changes;
    }

    /**
     * Check if value has changed
     */
    protected function isValueChanged($oldValue, $newValue): bool
    {
        // Normalize values for comparison
        $oldNormalized = is_array($oldValue) ? json_encode($oldValue) : $oldValue;
        $newNormalized = is_array($newValue) ? json_encode($newValue) : $newValue;

        return $oldNormalized !== $newNormalized;
    }


    private function saveModel(?int $id = null): static {
        $this->model = is_null($id) 
                        ? $this->repository->create($this->modelData)
                        : $this->repository->update($id, $this->modelData);

        $this->result = $this->model;
        return $this;
    }

    protected function getResult(){
        return $this->result;
    }

    public function findById(int $id){
        $this->model = $this->repository->findById($id, $this->with);
    }

    public function show(int $id){
        $this->findById($id);
        $this->result = $this->model;
        return $this->getResult();
    }

    public function paginate(Request $request){
        $this->setRequest($request);
        $specifications = $this->specifications();
        $this->result = $this->repository->pagination($specifications);
        // dd($this->result);
        return $this->getResult();
    }

    public function destroy($id){
        $module = $this->getModuleName();
        $record = null;


        try {
            $result = $this->beginTransaction()
                ->beforeDelete($id)
                ->deleteModel()
                ->afterDelete()
                ->commit()
                ->getResult();

            // Load record sau khi delete thành công để tracking (trước khi commit, model vẫn còn)
            if($result && $this->model){
                $record = $this->model;
            }
            
            // Track delete action sau khi commit thành công
            if ($result && $record) {
                $this->trackDelete($module, $record);
            }


            return $result;

        } catch (\Throwable $th) {
            // Track failed action - load record lại để tracking nếu model chưa có
            if (!$this->model) {
                try {
                    $record = $this->repository->findById($id, $this->with);
                    $this->trackFailed('delete', $module, $record, $th->getMessage());
                } catch (\Exception $e) {
                    // Nếu không load được record, track với id thôi
                    $this->trackFailed('delete', $module, ['id' => $id], $th->getMessage());
                }
            } else {
                $this->trackFailed('delete', $module, $this->model, $th->getMessage());
            }

            $this->rollback();
            // Re-throw exception để controller có thể xử lý và hiển thị message
            throw $th;
        }
    }

    public function deleteModel(): static{
        $this->result = $this->model->delete();
        return $this;
    }

    public function bulkDestroy(Request $request){
        try {
            return $this->beginTransaction()
            ->setRequest($request)
            ->beforeBulkDestroy()
            ->bulkDestroyModel()
            ->afterBulkDestroy()
            ->commit()->getResult();
        } catch (\Throwable $th) {
            $this->rollback();
            return false;
        }
    }

    protected function bulkDestroyModel(): static {
        $this->result = $this->repository->bulkDestroy($this->request->input('ids', []));
        return $this;
    }

    public function bulkUpdate(Request $request){
        try {
            return $this->beginTransaction()
            ->setRequest($request)
            ->beforeBulkUpdate()
            ->bulkUpdateModel()
            ->afterBulkUpdate()
            ->commit()->getResult();

        } catch (\Throwable $th) {
            $this->rollback();
            return false;
        }
    }

    protected function bulkUpdateModel(): static {
        $fillable = $this->repository->getFillable();
        $payload = $this->request->only($fillable);
        $this->result = $this->repository->bulkUpdate($this->request->input('ids', []), $payload);
        return $this;
    }

    public function setWith(array $with = []): static {
        $this->with = $with;
        return $this;
    }

    protected function when(bool $condition, callable $callback): static{
        return $condition ? $callback($this) : $this;
    }

    protected function unless(bool $condition, callable $callback): static{
        return !$condition ? $callback($this) : $this;
    }

    protected function beforeDelete($id): static{
        // Load model if not already loaded
        if(!$this->model){
            $this->findById($id);
        }
        return $this;
    }

    protected function beforeBulkDestroy(): static{
        return $this;
    }

    protected function beforeBulkUpdate(): static{
        return $this;
    }
}