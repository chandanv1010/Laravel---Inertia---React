<?php  
namespace App\Traits;

trait HasCataloguePagination {
    
    /**
     * Override pagination để áp dụng scope filterByCatalogue
     * Repo chỉ gọi scope, không có logic check
     * 
     * Config được truyền từ Service qua specifications['filter']['catalogue_config']
     * Format: ['mainRelationKey', 'pivotRelationName', 'catalogueTable']
     */
    public function pagination(array $specs = []){
        // Nếu có catalogue_ids từ Service layer, áp dụng scope filterByCatalogue
        if(isset($specs['filter']['catalogue_ids']) && !empty($specs['filter']['catalogue_ids'])){
            $childCatalogueIds = $specs['filter']['catalogue_ids'];
            unset($specs['filter']['catalogue_ids']);
            
            // Lấy config từ Service (nếu có) hoặc fallback sang class properties
            $config = $specs['filter']['catalogue_config'] ?? null;
            unset($specs['filter']['catalogue_config']);
            
            if($config && is_array($config) && count($config) >= 3){
                [$mainRelationKey, $pivotRelationName, $catalogueTable] = $config;
            } elseif(property_exists($this, 'catalogueMainRelationKey') && 
                     property_exists($this, 'cataloguePivotRelationName') && 
                     property_exists($this, 'catalogueTable')) {
                // Fallback: lấy config từ class properties (được define trong Service)
                $mainRelationKey = $this->catalogueMainRelationKey;
                $pivotRelationName = $this->cataloguePivotRelationName;
                $catalogueTable = $this->catalogueTable;
            } else {
                throw new \Exception('Catalogue filter config is required. Please set catalogue_config or define catalogueMainRelationKey, cataloguePivotRelationName, catalogueTable properties.');
            }
            
            // Áp dụng scope filterByCatalogue trên query builder
            // Bắt đầu từ model instance và áp dụng scope filterByCatalogue trước các scope khác
            $sort = $specs['sort'] ?? ['id', 'desc'];
            $query = $this->model
                ->filterByCatalogue($childCatalogueIds, $mainRelationKey, $pivotRelationName, $catalogueTable)
                ->simpleFilter($specs['filter']['simple'] ?? [])
                ->complexFilter($specs['filter']['complex'] ?? [])
                ->dateFilter($specs['filter']['date'] ?? [])
                ->withFilter($specs['filter']['with'] ?? [])
                ->attributeFilter($specs['filter']['attributes'] ?? [])
                ->keyword($specs['filter']['keyword'] ?? [])
                ->when(!empty($sort), function($query) use ($sort) {
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
                ->with($specs['with'] ?? []);
            
            // Debug: Log SQL query
            \Illuminate\Support\Facades\Log::info("HasCataloguePagination - SQL Query: " . $query->toSql());
            \Illuminate\Support\Facades\Log::info("HasCataloguePagination - Bindings: " . json_encode($query->getBindings()));
            
            return $query->when(
                $specs['all'] ?? false,
                fn($q) => $q->get(),
                fn($q) => $q->paginate($specs['perpage'] ?? 15)->withQueryString()
            );
        }
        
        // Nếu không có catalogue filter, gọi parent pagination như bình thường
        return parent::pagination($specs);
    }
}

