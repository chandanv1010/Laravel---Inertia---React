<?php  
namespace App\Services\Impl\V1\Cache;

use App\Services\Impl\V1\BaseService;
use App\Traits\HasCache;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

abstract class BaseCacheService extends BaseService {

    use HasCache;

    /**
     * Cache strategy: 'default' , 'hot_queries', 'all', 'dataset' vv....
     */
    protected string $cacheStrategy = 'default';

    /**
     * Cache enabled - Có thể được Override lại từ lớp Con
     */
    protected bool $cacheEnabled = true;

    /**
     * Danh sách hot keywords cho module (có thể override)
     */
    protected array $hotKeywords = [];

    /**
     * Số lượng hot keywords tối đa
     */
    protected int $maxHotKeywords = 10;


    /**
     * Override lại method paginate của lớp cha
    */

    public function paginate(Request $request)
    {
        if(!$this->cacheEnabled || !config('cache_modules.enabled', true)){
            return parent::paginate($request);
        }

        return match ($this->cacheStrategy) {
            'default' => $this->paginateDefault($request),
            'hot_queries' => $this->paginateHotQueries($request),
            'cache_all' => $this->paginateAll($request),
            'dataset' => $this->paginateWithDataset($request),
            'lazy' => $this->paginateLazy($request),
            default => parent::paginate($request),
        };
    }

    protected function paginateDefault(Request $request){
        if(!$this->isDefaultQuery($request)){
            return parent::paginate($request);
        }
        $page = $request->input('page', 1);
        $cacheKey = "paginate_default_page_{$page}";
        $ttl = config('cache_modules.ttl_paginate.default', 600); // 10mins
        $this->result = $this->rememberCache($cacheKey, $ttl, function() use ($request){
            return parent::paginate($request);
        });
        return $this->getResult();
    }

    private function isDefaultQuery(Request $request){
        $this->setRequest($request);
        if(
            !empty($this->build($this->simpleFilter ?? []))
            || ($request->has('keyword') && !empty($request->input('keyword')))
            || !empty($this->build($this->complexFilter ?? []))
            || !empty($this->build($this->dateFilter ?? []))
            || !empty($this->build($this->withFilters ?? []))
        ){
            return false;
        }

        $sort = $request->input('sort') ? explode(',', $request->input('sort')) : ($this->sort ?? ['id', 'desc']);
        $defaultSort = $this->sort ?? ['id', 'desc'];
        if($sort[0] !== $defaultSort[0] || $sort[1] !== $defaultSort[1]){
            return false;
        }

        $perpage = $request->input('perpage') ?? ($this->perpage ?? 20);
        $defaultPerpage = $this->perpage ?? 20;
        if($perpage !== $defaultPerpage){
            return false;
        }
        return true;

    }


    /**
     * override lại method show của lớp cha
     */
    public function show(int $id)
    {
        if(!$this->cacheEnabled || !config('cache_modules.enabled', true)){
            return parent::show($id);
        }
        $cacheKey = $this->getShowCacheKey($id);
        $ttl = config('cache_modules.ttl', 3600);

        $this->result = $this->rememberCache($cacheKey, $ttl, function() use ($id){
            return parent::show($id);
        });
        return $this->getResult();
    }

    protected function afterSave(): static
    {
        $this->invalidateCache();
        return parent::afterSave();
    }

    protected function afterDelete(): static
    {
        $this->invalidateCache();
        return parent::afterDelete();
    }

    protected function afterBulkDestroy(): static
    {
        $this->invalidateCache();
        return parent::afterBulkDestroy();
    }

    protected function afterBulkUpdate(): static
    {
        $this->invalidateCache();
        return parent::afterBulkUpdate();
    }

    protected function getStrategyTtl(string $strategy): int {
        return config("cache_modules.ttl_paginate.{$strategy}", config('cache_modules.ttl_paginate.default', 600));
    }

    protected function shouldCacheQuery(Request $request): bool {
        return $this->cacheEnabled && config('cache_modules.enabled', true);
    }

    protected function getCacheKeyByStrategy(Request $request, string $strategy): string {
        return match($strategy) {
            'dataset' => $this->getDatasetCacheKey(),
            'hot_queries' => $this->getHotKeywordCacheKey($request->input('keyword', '')),
            'cache_all' => $this->getCacheAllKey($request),
            default => $this->getPaginateCacheKey($request),
        };
    }

    protected function paginateWithDataset(Request $request) {
        $this->setRequest($request);
        
        $specifications = $this->specifications();
        $filterHash = md5(json_encode([
            'filters' => $specifications['filter'] ?? [],
            'sort' => $specifications['sort'] ?? [],
            'with' => $specifications['with'] ?? [],
        ]));
        
        $cacheKey = $this->getDatasetCacheKey() . "_{$filterHash}";
        $ttl = $this->getStrategyTtl('dataset');

        $dataset = $this->rememberCache($cacheKey, $ttl, function() use ($specifications) {
            $specifications['all'] = true;
            return $this->repository->pagination($specifications);
        });

        $page = $request->input('page', 1);
        $perpage = $request->input('perpage') ?? ($this->perpage ?? 20);
        
        $total = $dataset->count();
        $items = $dataset->forPage($page, $perpage)->values();
        
        $this->result = new LengthAwarePaginator(
            $items,
            $total,
            $perpage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return $this->getResult();
    }

    protected function paginateHotQueries(Request $request) {
        $this->setRequest($request);
        $keyword = $request->input('keyword', '');

        if(empty($keyword)){
            return $this->paginateDefault($request);
        }

        $this->trackHotKeyword($keyword);

        if(!$this->isHotKeyword($keyword)){
            return parent::paginate($request);
        }

        $cacheKey = $this->getHotKeywordCacheKey($keyword);
        $ttl = $this->getStrategyTtl('hot_keyword');

        $this->result = $this->rememberCache($cacheKey, $ttl, function() use ($request) {
            return parent::paginate($request);
        });

        return $this->getResult();
    }

    protected function paginateAll(Request $request) {
        $this->setRequest($request);
        $cacheKey = $this->getCacheAllKey($request);
        $ttl = $this->getStrategyTtl('cache_all');

        $this->result = $this->rememberCache($cacheKey, $ttl, function() use ($request) {
            return parent::paginate($request);
        });

        return $this->getResult();
    }

    protected function paginateLazy(Request $request) {
        $this->setRequest($request);
        $queryKey = $this->getQueryKey($request);
        
        $this->trackQueryHit($queryKey);

        if(!$this->shouldCacheByHits($queryKey)){
            return parent::paginate($request);
        }

        $cacheKey = $this->getCacheAllKey($request);
        $ttl = config('cache_modules.lazy_cache.ttl', $this->getStrategyTtl('default'));

        $this->result = $this->rememberCache($cacheKey, $ttl, function() use ($request) {
            return parent::paginate($request);
        });

        return $this->getResult();
    }

    /**
     * Invalidate tất cả cache liên quan đến module này
     * Tự động xử lý theo cache strategy và clear tất cả cache types
     */
    public function invalidateCache(): static {
        // Clear show cache nếu có model
        if(isset($this->model) && $this->model->id){
            $this->forgetCache($this->getShowCacheKey($this->model->id));
        }

        // Clear cache theo strategy
        match($this->cacheStrategy) {
            'dataset' => $this->invalidateDatasetCache(),
            'hot_queries' => $this->invalidateHotKeywordCache(),
            'lazy', 'cache_all', 'default' => $this->invalidatePaginateCache(),
            default => $this->invalidatePaginateCache(),
        };

        // Luôn flush toàn bộ cache của module để đảm bảo clear hết
        // Vì có thể có nhiều cache keys với các filter hash khác nhau
        $this->clearModuleCache();

        return $this;
    }

    public function invalidateAllCache(): static {
        $this->invalidateCache();
        $this->invalidateDatasetCache();
        $this->invalidateHotKeywordCache();
        $this->invalidatePaginateCache();
        return $this;
    }

}