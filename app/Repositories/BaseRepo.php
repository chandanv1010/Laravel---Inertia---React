<?php   
namespace App\Repositories;
use Illuminate\Database\Eloquent\Model;

class BaseRepo {
    
    protected $model;

    public function __construct($model)
    {
        $this->model = $model;
    }

    public function getFillable(): array {
        return $this->model->getFillable();
    }

    public function getRelationable(): array {
        return $this->model->getRelationable();
    }

    public function create(array $payload = []): Model | null {
        return $this->model->create($payload)->fresh();
    }

    public function update(int $id, array $payload = []): Model {
        $model = $this->findById($id);
        $model->fill($payload);
        $model->save();
        return $model;
    }

    public function findById(int $id, array $with = [], array $column = ['*']){
        return $this->model->select($column)->with($with)->findOrFail($id);
    }
    // 'all' => true/false  
    public function pagination(array $specs = []){
        return $this->model
        ->simpleFilter($specs['filter']['simple'] ?? [])
        ->complexFilter($specs['filter']['complex'] ?? [])
        ->dateFilter($specs['filter']['date'] ?? [])
        ->withFilter($specs['filter']['with'] ?? [])
        ->keyword($specs['filter']['keyword'] ?? [])
        ->when(!empty($specs['sort']), function($query) use ($specs) {
            $sort = $specs['sort'];
            // Check if multi-column sort: [['id', 'desc'], ['order', 'asc']]
            if (isset($sort[0]) && is_array($sort[0])) {
                foreach ($sort as $s) {
                    if (isset($s[0], $s[1])) {
                        $query->orderBy($s[0], $s[1]);
                    }
                }
            } 
            // Single column sort: ['id', 'desc'] 
            elseif (isset($sort[0], $sort[1])) {
                $query->orderBy($sort[0], $sort[1]);
            }
        })
        ->with($specs['with'] ?? [])
        ->when(
            $specs['all'],
            fn($q) => $q->get(),
            fn($q) => $q->paginate($specs['perpage'])->withQueryString()
            // fn($q) => $q->toSql()
        );
    }

    public function bulkDestroy(array $ids = [], ?bool $forceDelete = false  ){
        return $forceDelete ? $this->model->whereIn('id', $ids)->forceDelete() : $this->model->whereIn('id', $ids)->delete();
    }

    public function bulkUpdate(array $ids = [], array $payload = []){
        return $this->model->whereIn('id', $ids)->update($payload);
    }

    public function getModel(){
        return $this->model;
    }

    public function getTable(){
        return $this->model->getTable();
    }

}