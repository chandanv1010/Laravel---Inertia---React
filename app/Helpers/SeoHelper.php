<?php

namespace App\Helpers;

use App\Services\Interfaces\Setting\SystemServiceInterface;

class SeoHelper
{
    protected static $systemService = null;
    protected static $cachedConfig = null;

    /**
     * Get SystemService instance
     */
    protected static function getSystemService(): SystemServiceInterface
    {
        if (self::$systemService === null) {
            self::$systemService = app(SystemServiceInterface::class);
        }
        return self::$systemService;
    }

    /**
     * Get cached config from systems
     */
    protected static function getConfig(): array
    {
        if (self::$cachedConfig === null) {
            self::$cachedConfig = self::getSystemService()->getAllConfig();
        }
        return self::$cachedConfig;
    }

    /**
     * SEO cho trang chủ - lấy từ systems
     */
    public static function home(): array
    {
        $config = self::getConfig();
        
        return [
            'meta_title' => $config['meta_title'] ?? config('app.name'),
            'meta_description' => $config['meta_description'] ?? '',
            'meta_keywords' => $config['meta_keyword'] ?? '',
            'meta_image' => $config['meta_image'] ?? ($config['website_logo'] ?? ''),
        ];
    }

    /**
     * SEO cho trang bình thường - từ model có translations
     */
    public static function fromModel($model, int $languageId = null): array
    {
        $languageId = $languageId ?? config('app.language_id', 1);
        
        // Get translation pivot
        $pivot = null;
        if (method_exists($model, 'languages') && $model->relationLoaded('languages')) {
            $lang = $model->languages->firstWhere('id', $languageId);
            $pivot = $lang?->pivot;
        }
        
        // Fallback to config for defaults
        $config = self::getConfig();
        
        return [
            'meta_title' => $pivot?->meta_title ?? $pivot?->name ?? config('app.name'),
            'meta_description' => $pivot?->meta_description ?? $pivot?->description ?? '',
            'meta_keywords' => $pivot?->meta_keyword ?? '',
            'meta_robots' => $model->meta_robots ?? 'index, follow', // Default to index, follow
            'meta_image' => $model->image ?? ($config['website_logo'] ?? ''),
            'canonical' => $pivot?->canonical ?? null,
        ];
    }

    /**
     * SEO từ array data
     */
    public static function fromArray(array $data): array
    {
        $config = self::getConfig();
        
        return [
            'meta_title' => $data['meta_title'] ?? $data['name'] ?? config('app.name'),
            'meta_description' => $data['meta_description'] ?? $data['description'] ?? '',
            'meta_keywords' => $data['meta_keyword'] ?? $data['meta_keywords'] ?? '',
            'meta_image' => $data['image'] ?? ($config['website_logo'] ?? ''),
            'canonical' => $data['canonical'] ?? null,
        ];
    }
}
