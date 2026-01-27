<?php  
namespace App\Traits;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

trait HasCanonical {

    protected ?string $canonicalModule = null;

    protected function getCanonicalModule(): ?string {
        return $this->getTable();
    }

    protected function getUrlType(): string {
        $module = $this->getCanonicalModule();
        $cacheKey = config('seo.cache.key_prefix') . ($module ? ":{$module}" : ':global');
        if(!config('seo.cache.enabled')){
            return $this->resolveUrlType($module);
        }
        return Cache::remember($cacheKey, config('seo.cache.ttl', 86400), function() use ($module){
            return $this->resolveUrlType($module); 
        });
    }

    protected function resolveUrlType(string $module): string {
        if($module && $moduleTypeUrl = config("seo.modules.{$module}")){
            return $moduleTypeUrl;
        }
        return config('seo.url_type', 'slug');
    }

    protected function formatCanonical(string $canonical): string {
        if(empty($canonical)) return '';

        $urlType = $this->getUrlType(); // slug, silo
        return match ($urlType) {
            'silo' => $this->formatSiloCanonical($canonical),
            'slug', 'static' => Str::slug($canonical),
            default => Str::slug($canonical)
        };

    }

    protected function formatSiloCanonical(string $canonical): string {
        $segments = explode('/', $canonical);
        return collect($segments)
        ->map(fn($segment) => Str::slug($segment))
        ->filter(fn($segment) => !empty($segment))
        ->join('/');
    }

    public static function clearUrlTypeCache(?string $module = null): void {
        $prefix = config('seo.cache.key_prefix');
        if($module){
            Cache::forget("{$prefix}:{$module}");
        }else{
            Cache::forget("{$prefix}:global");
            foreach(config('seo.modules') as $mod){
                Cache::forget("{$prefix}:{$mod}");
            }
        }
    }

}