<?php  
namespace App\Traits;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Http\Request;

trait HasCache {

    protected function getModuleName(): string {
        return $this->module ?? $this->repository->getTable();
    }
    
    protected function getCachePrefix(): string {
        return Str::slug($this->getModuleName(), '_');
    }

    protected function getFullCacheKey(string $key): string {
        return $this->getCachePrefix(). '_' . $key;
    }

    protected function rememberCache(string $key, int $ttl, callable $callback){
        if(!config('cache_modules.enabled', true)){
            return $callback();
        }

        $fullCacheKey = $this->getFullCacheKey($key);
        $prefix = $this->getCachePrefix();
        
        // Sử dụng tags để có thể flush theo module sau này
        return Cache::tags([$prefix])->remember($fullCacheKey, $ttl, $callback);
    }

    protected function forgetCache(string $key): void {
        $fullCacheKey = $this->getFullCacheKey($key);
        $prefix = $this->getCachePrefix();
        
        // Sử dụng tags để forget cache đúng cách
        Cache::tags([$prefix])->forget($fullCacheKey);
    }

    protected function getPaginateCacheKey(Request $request): string {
        $params = $request->all();
        krsort($params);
        $hash = md5(json_encode($params));
        return "paginate_{$hash}";
    }

    protected function getShowCacheKey(int $id): string {
        return "show_{$id}";
    }

    public function invalidateCache(): static{
        if(isset($this->model) && $this->model->id){
            $this->forgetCache($this->getShowCacheKey($this->model->id));
        }
        return $this;
    }
     
    public function clearModuleCache(): static {
        $prefix = $this->getCachePrefix();
        Cache::tags([$prefix])->flush();
        return $this;
    }

    protected function getDatasetCacheKey(): string {
        return 'dataset_all';
    }

    protected function getHotKeywordCacheKey(string $keyword): string {
        $keywordSlug = Str::slug($keyword, '_');
        return "paginate_hot_keyword_{$keywordSlug}";
    }

    protected function getCacheAllKey(Request $request): string {
        $params = $request->all();
        krsort($params);
        $hash = md5(json_encode($params));
        return "paginate_all_{$hash}";
    }

    public function invalidatePaginateCache(): static {
        $prefix = $this->getCachePrefix();
        $pattern = $this->getFullCacheKey('paginate_');
        Cache::tags([$prefix])->flush();
        return $this;
    }

    public function invalidateDatasetCache(): static {
        // Flush toàn bộ cache của module vì dataset cache có nhiều keys với filter hash
        $prefix = $this->getCachePrefix();
        Cache::tags([$prefix])->flush();
        return $this;
    }

    public function invalidateHotKeywordCache(?string $keyword = null): static {
        if($keyword){
            $this->forgetCache($this->getHotKeywordCacheKey($keyword));
        } else {
            $prefix = $this->getCachePrefix();
            Cache::tags([$prefix])->flush();
        }
        return $this;
    }

    protected function trackHotKeyword(string $keyword): void {
        if(empty($keyword)){
            return;
        }

        $key = $this->getFullCacheKey("hot_keyword_counter_{$keyword}");
        $prefix = $this->getCachePrefix();
        $count = Cache::tags([$prefix])->get($key, 0);
        Cache::tags([$prefix])->put($key, $count + 1, now()->addDays(7));
    }

    protected function isHotKeyword(string $keyword): bool {
        if(empty($keyword)){
            return false;
        }

        $key = $this->getFullCacheKey("hot_keyword_counter_{$keyword}");
        $prefix = $this->getCachePrefix();
        $count = Cache::tags([$prefix])->get($key, 0);
        $minRequests = config('cache_modules.hot_keywords.min_requests', 5);
        
        return $count >= $minRequests;
    }

    protected function trackQueryHit(string $queryKey): void {
        if(!config('cache_modules.lazy_cache.enabled', false)){
            return;
        }

        $hitKey = $this->getFullCacheKey("query_hit_counter_{$queryKey}");
        $prefix = $this->getCachePrefix();
        $count = Cache::tags([$prefix])->get($hitKey, 0);
        Cache::tags([$prefix])->put($hitKey, $count + 1, now()->addDays(7));
    }

    protected function getQueryHitCount(string $queryKey): int {
        if(!config('cache_modules.lazy_cache.enabled', false)){
            return 0;
        }

        $hitKey = $this->getFullCacheKey("query_hit_counter_{$queryKey}");
        $prefix = $this->getCachePrefix();
        return Cache::tags([$prefix])->get($hitKey, 0);
    }

    protected function shouldCacheByHits(string $queryKey): bool {
        if(!config('cache_modules.lazy_cache.enabled', false)){
            return true;
        }

        $minHits = config('cache_modules.lazy_cache.min_hits', 3);
        $hitCount = $this->getQueryHitCount($queryKey);
        
        return $hitCount >= $minHits;
    }

    protected function getQueryKey(Request $request): string {
        $params = $request->all();
        krsort($params);
        return md5(json_encode($params));
    }

}
