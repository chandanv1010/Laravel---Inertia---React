<?php  
namespace App\Traits;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

trait HasQuery {

    public function scopeSimpleFilter($query, array $filters = []){
        if(is_array($filters) && count($filters)){
            foreach($filters as $field => $value){
                // Skip array values (chúng được xử lý bởi complexFilter)
                if(is_array($value)){
                    continue;
                }
                if(!empty($value) && $value != 0 && !is_null($value)){
                    $query->where($field, $value);
                }
            }
        }
        return $query;
    }

    public function scopeKeyword($query, $keyword = []){
        if(isset($keyword['q']) && !is_null($keyword['q']) ){
            if(!$keyword['isMultipleLanguage']){
                $query->where(function($q) use ($keyword){
                    foreach($keyword['fields'] as $field){
                        $q->orWhere($field, 'LIKE', '%'.$keyword['q']. '%');
                    }
                });
            }else{
                // Lấy tên bảng pivot từ keyword config (truyền từ Service layer)
                $pivotTable = $keyword['pivotTable'] ?? $this->getPivotTableName();
                $foreignKey = $keyword['pivotForeignKey'] ?? $this->getLanguagesForeignKey();
                
                $modelTable = $this->getTable();
                $modelKey = $this->getKeyName();
                
                // Query trực tiếp trên pivot table thay vì dùng whereHas để tránh ambiguous column
                $query->whereExists(function($subQuery) use ($keyword, $pivotTable, $foreignKey, $modelTable, $modelKey) {
                    $subQuery->select(DB::raw(1))
                        ->from($pivotTable)
                        ->whereColumn("{$pivotTable}.{$foreignKey}", "{$modelTable}.{$modelKey}")
                        ->where(function($q) use ($keyword, $pivotTable) {
                            foreach($keyword['fields'] as $field){
                                // Sử dụng tên bảng pivot để tránh ambiguous column
                                $q->orWhere("{$pivotTable}.{$field}", 'LIKE', '%'.$keyword['q']. '%');
                            }
                        });
                });
            }
            return $query;
        }
       
    }
    
    /**
     * Lấy tên bảng pivot từ relationship languages
     */
    protected function getPivotTableName(): string
    {
        // Kiểm tra xem model có method languages() không
        if(method_exists($this, 'languages')){
            $relation = $this->languages();
            // Lấy tên bảng pivot từ BelongsToMany relationship
            if($relation instanceof \Illuminate\Database\Eloquent\Relations\BelongsToMany){
                return $relation->getTable();
            }
        }
        
        // Fallback: dựa vào tên model để đoán tên pivot table
        $modelName = class_basename($this);
        $tableName = strtolower(Str::plural($modelName));
        
        // Mapping các model phổ biến
        $pivotMap = [
            'postcatalogues' => 'post_catalogue_language',
            'posts' => 'post_language',
            'usercatalogues' => 'user_catalogue_language',
        ];
        
        $key = strtolower(str_replace('_', '', $tableName));
        return $pivotMap[$key] ?? "{$tableName}_language";
    }
    
    /**
     * Lấy foreign key từ relationship languages
     */
    protected function getLanguagesForeignKey(): string
    {
        // Kiểm tra xem model có method languages() không
        if(method_exists($this, 'languages')){
            $relation = $this->languages();
            // Lấy foreign key từ BelongsToMany relationship
            if($relation instanceof \Illuminate\Database\Eloquent\Relations\BelongsToMany){
                return $relation->getForeignPivotKeyName();
            }
        }
        
        // Fallback: dựa vào tên model để đoán foreign key
        $modelName = class_basename($this);
        $tableName = strtolower(Str::singular($modelName));
        
        // Mapping các model phổ biến
        $foreignKeyMap = [
            'postcatalogue' => 'post_catalogue_id',
            'post' => 'post_id',
            'usercatalogue' => 'user_catalogue_id',
        ];
        
        $key = strtolower(str_replace('_', '', $tableName));
        return $foreignKeyMap[$key] ?? "{$tableName}_id";
    }

    public function scopeComplexFilter($query, array $filters = [], string $relationName = ''){
        if(count($filters)){


            foreach($filters as $field => $condition){
                if(count($condition)){
                    $qualifiedField = !empty($relationName) ? "{$relationName}.{$field}" : $field;


                    foreach($condition as $operator => $value){
                        switch ($operator) {
                            case 'gt':
                                $query->where($qualifiedField, '>', $value);
                                break;
                            case 'gte':
                                $query->where($qualifiedField, '>=', $value);
                                break;
                            case 'lt':
                                $query->where($qualifiedField, '<', $value);
                                break;
                            case 'lte':
                                $query->where($qualifiedField, '<=', $value);
                                break;
                            case 'eq':
                                $query->where($qualifiedField, '=', $value);
                                break;
                            case 'between':
                                $parts = explode(',', $value);
                                if(count($parts) == 2){
                                    [$min, $max] = $parts;
                                    $query->whereBetween($qualifiedField, [$min, $max]);
                                }
                                break;
                            case 'in':
                                $in = explode(',', $value);
                                if(isset($in) && count($in)){
                                    $query->whereIn($qualifiedField, $in);
                                }
                                break;
                            
                            default:
                                # code...
                                break;
                        }
                    }
                }
            }
        }
        return $query;
    }

    //d-m-y
    public function scopeDateFilter($query, array $filters = []){
        if(count($filters)){
            foreach($filters as $field => $condition){
                if(count($condition)){
                    foreach($condition as $operator => $value){
                        switch ($operator) {
                            case 'gt':
                                $query->where($field, '>', Carbon::parse($value)->startOfDay());
                                break;
                            case 'gte':
                                $query->where($field, '>=', Carbon::parse($value)->startOfDay());
                                break;
                            case 'lt':
                                $query->where($field, '<', Carbon::parse($value)->endOfDay());
                                break;
                            case 'lte':
                                $query->where($field, '<=', Carbon::parse($value)->endOfDay());
                                break;
                            case 'eq':
                                $query->where($field, '=', Carbon::parse($value)->startOfDay());
                                break;
                            case 'between':
                                $parts =  explode(',', $value);
                                if(count($parts) === 2){
                                    [$startDate, $endDate] = $parts;
                                    $startDate = Carbon::parse($startDate)->startOfDay();
                                    $endDate = Carbon::parse($endDate)->endOfDay();
                                    if(isset($startDate) && isset($endDate) && $startDate < $endDate){
                                        $query->whereBetween($field, [$startDate, $endDate]);
                                    }
                                }

                                
                                break;
                            
                            default:
                                # code...
                                break;
                        }
                    }
                }
            }
        }
        return $query;
    }

    protected function scopeWithFilter($query, array $filters = []){
        if(count($filters)){
            foreach($filters as $model => $condition){
                $query->whereHas($model, function($subQuery)  use ($condition, $model){
                    $this->applyRelationRecursive($subQuery, $condition, $model);
                });
            }
        }
    }

    public function scopeAttributeFilter($query, array $filters = [])
    {
        if (count($filters)) {
            $query->whereHas('attributes', function($q) use ($filters){
                $q->whereIn('attribute_id', $filters);
            });
        }
        return $query;
    }

    private function applyRelationRecursive($query, array $conditions = [], string $model = ''){
        $fieldConditions = [];
        $relationConditions = [];
        $operatorArray = array_flip(['gt', 'gte', 'lt', 'lte', 'eq', 'between', 'in', 'like']);
        foreach($conditions as $key => $val){
            if(isset($val) && is_array($val) && array_intersect_key($val, $operatorArray)){
                $fieldConditions[$key] = $val;
            }else{
                $relationConditions[$key] = $val;
            }
        }
        $this->scopeComplexFilter($query, $fieldConditions, $model);
        if(is_array($relationConditions) && count($relationConditions)){
            foreach($relationConditions as $key => $val){
                $query->whereHas($key, function($recursiveQuery) use ($val, $key){
                    $this->applyRelationRecursive($recursiveQuery, $val, $key);
                });
            }
        }
        
    }

    /**
     * Scope để filter theo danh mục và tất cả danh mục con (nested set)
     * Tái sử dụng cho các module có quan hệ với catalogue/category
     * Nhận childCatalogueIds từ Service layer (đã query qua Repository)
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param array $childCatalogueIds Danh sách ID của catalogue và các catalogue con (từ Service)
     * @param string $mainRelationKey Tên foreign key trong bảng chính (ví dụ: 'post_catalogue_id')
     * @param string $pivotRelationName Tên relation pivot (ví dụ: 'post_catalogues')
     * @param string $catalogueTable Tên bảng catalogue (ví dụ: 'post_catalogues')
     * @return \Illuminate\Database\Eloquent\Builder
     */
    /**
     * Scope để filter theo danh mục và tất cả danh mục con (nested set)
     * Nhận childCatalogueIds đã được tính toán từ Service (bao gồm chính catalogue và tất cả con)
     * Chỉ cần dùng whereIn để filter
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param array $childCatalogueIds Danh sách ID đã bao gồm catalogue và tất cả con (từ Service)
     * @param string $mainRelationKey Tên foreign key trong bảng chính (ví dụ: 'post_catalogue_id')
     * @param string $pivotRelationName Tên relation pivot (ví dụ: 'post_catalogues')
     * @param string $catalogueTable Tên bảng catalogue (ví dụ: 'post_catalogues') - không dùng trong scope này
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeFilterByCatalogue(
        $query, 
        array $childCatalogueIds, 
        string $mainRelationKey, 
        string $pivotRelationName,
        string $catalogueTable
    ){
        if(empty($childCatalogueIds)) return $query;

        // Debug: Log để kiểm tra
        Log::info("scopeFilterByCatalogue - Filtering with catalogue IDs: " . implode(',', $childCatalogueIds));
        Log::info("scopeFilterByCatalogue - Main relation key: {$mainRelationKey}, Pivot relation: {$pivotRelationName}");

        // Filter posts thuộc bất kỳ catalogue nào trong danh sách (đã bao gồm chính catalogue và tất cả con)
        // Sử dụng OR để lấy posts thuộc main relation HOẶC pivot relation
        $result = $query->where(function($q) use ($childCatalogueIds, $mainRelationKey, $pivotRelationName, $query){
            // Filter theo main relation (post_catalogue_id) - dùng whereIn
            $q->whereIn($mainRelationKey, $childCatalogueIds);
            
            // HOẶC filter theo pivot relation (post_catalogues - many-to-many) - cũng dùng whereIn
            // Lấy model từ query để check method
            $model = $query->getModel();
            if(method_exists($model, $pivotRelationName)){
                $relation = $model->{$pivotRelationName}();
                if($relation instanceof \Illuminate\Database\Eloquent\Relations\BelongsToMany){
                    // Lấy tên bảng pivot (ví dụ: 'post_catalogue_post')
                    $pivotTable = $relation->getTable();
                    // Lấy foreign key cho catalogue trong pivot table (ví dụ: 'post_catalogue_id')
                    $relatedPivotKey = $relation->getRelatedPivotKeyName();
                    
                    Log::info("scopeFilterByCatalogue - Pivot table: {$pivotTable}, Related pivot key: {$relatedPivotKey}");
                    
                    // Filter trong pivot table bằng whereIn
                    // Trong whereHas, subquery đã scope vào pivot table, nên chỉ cần dùng tên cột
                    $q->orWhereHas($pivotRelationName, function($subQ) use ($childCatalogueIds, $relatedPivotKey){
                        $subQ->whereIn($relatedPivotKey, $childCatalogueIds);
                    });
                }
            }
        });
        
        // Debug: Log SQL sau khi filter
        Log::info("scopeFilterByCatalogue - SQL after filter: " . $result->toSql());
        Log::info("scopeFilterByCatalogue - Bindings: " . json_encode($result->getBindings()));
        
        return $result;
    }

}

