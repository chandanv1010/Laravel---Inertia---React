<?php

namespace App\Services\Impl\V1\Setting;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\Setting\SystemServiceInterface;
use App\Repositories\Setting\SystemRepo;
use App\Repositories\Setting\SystemCatalogueRepo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class SystemService extends BaseService implements SystemServiceInterface
{
    protected $systemCatalogueRepo;

    public function __construct(
        SystemRepo $repository,
        SystemCatalogueRepo $systemCatalogueRepo
    ) {
        $this->repository = $repository;
        $this->systemCatalogueRepo = $systemCatalogueRepo;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static
    {
        $this->modelData = $this->request->all();
        $this->modelData['user_id'] = Auth::id();
        return $this;
    }

    public function getSystemHierarchy()
    {
        // Get Catalogues with Systems and their language values
        return $this->systemCatalogueRepo->getModel()
            ->with(['systems' => function ($q) {
                $q->where('publish', 2)
                  ->orderBy('sort_order', 'asc')
                  ->with('languages'); // Let model's withPivot handle pivot data
            }])
            ->where('publish', 2)
            ->orderBy('sort_order', 'asc')
            ->get();
    }

    public function updateValues(array $payload)
    {
        \Illuminate\Support\Facades\Log::info('SystemService::updateValues called', [
            'payload_keys' => array_keys($payload),
            'payload_sample' => array_slice($payload, 0, 3), // Log first 3 items
        ]);
        
        // Payload format:
        // [
        //    'website_logo' => [
        //        'default' => '...',
        //        '2' (langId) => '...',
        //    ],
        //    ...
        // ]
        
        // Optimize: Load all systems by keyword first
        $keywords = array_keys($payload);
        $systems = $this->repository->getModel()->whereIn('keyword', $keywords)->get()->keyBy('keyword');
        
        \Illuminate\Support\Facades\Log::info('Found systems', [
            'keywords_requested' => $keywords,
            'systems_found' => $systems->keys()->toArray(),
        ]);

        DB::transaction(function () use ($payload, $systems) {
            foreach ($payload as $keyword => $values) {
                if (!isset($systems[$keyword])) continue;
                $system = $systems[$keyword];

                foreach ($values as $langId => $content) {
                    // Skip 'default' key - frontend sends separate language IDs (1, 2, etc.)
                    // so 'default' is redundant and often null which would overwrite valid values
                    if ($langId === 'default') {
                        continue;
                    }
                    
                    // Skip null/empty content to avoid overwriting existing values
                    if ($content === null || $content === '') {
                        continue;
                    }
                    
                    $targetLangId = is_numeric($langId) ? (int) $langId : 1;

                    // Content can be array if it's special type, but DB stores longtext.
                    // Cast to string/json if needed.
                    $finalContent = is_array($content) ? json_encode($content) : $content;

                    // Sync/Update pivot
                    // Use standard DB insert/update on duplicate key or updateExistingPivot?
                    // updateExistingPivot requires record to exist.
                    // DB::table('system_language')->updateOrInsert...
                    
                    DB::table('system_language')->updateOrInsert(
                        ['system_id' => $system->id, 'language_id' => $targetLangId],
                        ['content' => $finalContent]
                    );
                }
            }
        });

        return true;
    }

    // Static cache to avoid duplicate queries when both getSeoConfig and getAllConfig are called
    private static $cachedSettings = null;
    
    public function getSeoConfig()
    {
        // Database uses: meta_title, meta_description, meta_keyword (without seo_ prefix)
        $seoKeys = ['meta_title', 'meta_description', 'meta_keyword'];
        $languageId = config('app.language_id') ?? 1;
        
        // Use cached settings if available
        if (self::$cachedSettings !== null) {
            $config = [];
            foreach (self::$cachedSettings as $setting) {
                if (in_array($setting->keyword, $seoKeys)) {
                    $lang = $setting->languages->firstWhere('id', $languageId);
                    $config[$setting->keyword] = $lang?->pivot?->content;
                }
            }
            return $config;
        }
        
        // Load with eager loading
        $settings = $this->repository->getModel()
            ->whereIn('keyword', $seoKeys)
            ->where('publish', 2)
            ->with(['languages' => function ($q) use ($languageId) {
                $q->where('language_id', $languageId);
            }])
            ->get();
            
        $config = [];
        foreach ($settings as $setting) {
            $lang = $setting->languages->first();
            $config[$setting->keyword] = $lang?->pivot?->content;
        }

        return $config;
    }

    public function getAllConfig()
    {
        $languageId = config('app.language_id') ?? 1;
        
        // Cache settings for reuse
        if (self::$cachedSettings === null) {
            self::$cachedSettings = $this->repository->getModel()
                ->where('publish', 2)
                ->with(['languages' => function ($q) use ($languageId) {
                    $q->where('language_id', $languageId);
                }])
                ->get();
        }
            
        $config = [];
        foreach (self::$cachedSettings as $setting) {
            $lang = $setting->languages->first();
            $config[$setting->keyword] = $lang?->pivot?->content;
        }

        return $config;
    }
}
