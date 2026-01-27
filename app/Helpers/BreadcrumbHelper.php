<?php

namespace App\Helpers;

use Illuminate\Database\Eloquent\Model;

/**
 * BreadcrumbHelper - Tạo breadcrumb cho các module
 */
class BreadcrumbHelper
{
    /**
     * Tạo breadcrumb từ model có cấu trúc cây (ProductCatalogue, PostCatalogue, etc.)
     * 
     * @param Model $model Model hiện tại
     * @param int $languageId Language ID
     * @param string $urlSuffix Hậu tố URL (mặc định: .html)
     */
    public static function fromCatalogue(Model $model, int $languageId, string $urlSuffix = '.html'): array
    {
        $ancestors = RecursiveHelper::getAncestors($model);
        
        $breadcrumbs = [
            ['name' => 'Trang chủ', 'url' => '/'],
        ];
        
        foreach ($ancestors as $node) {
            $lang = $node->languages->firstWhere('id', $languageId);
            $name = $lang?->pivot?->name ?? $node->name ?? '';
            $canonical = $lang?->pivot?->canonical ?? '';
            
            $breadcrumbs[] = [
                'name' => $name,
                'url' => '/' . $canonical . $urlSuffix,
            ];
        }
        
        return $breadcrumbs;
    }

    /**
     * Tạo breadcrumb từ model sản phẩm/bài viết
     * 
     * @param Model $model Model sản phẩm/bài viết
     * @param Model|null $catalogue Danh mục của model
     * @param int $languageId Language ID
     * @param string $urlSuffix Hậu tố URL
     */
    public static function fromItem(Model $model, ?Model $catalogue, int $languageId, string $urlSuffix = '.html'): array
    {
        $breadcrumbs = [];
        
        if ($catalogue) {
            $breadcrumbs = self::fromCatalogue($catalogue, $languageId, $urlSuffix);
        } else {
            $breadcrumbs = [['name' => 'Trang chủ', 'url' => '/']];
        }
        
        $lang = $model->languages->firstWhere('id', $languageId);
        $name = $lang?->pivot?->name ?? $model->name ?? '';
        $canonical = $lang?->pivot?->canonical ?? '';
        
        $breadcrumbs[] = [
            'name' => $name,
            'url' => '/' . $canonical . $urlSuffix,
        ];
        
        return $breadcrumbs;
    }

    /**
     * Tạo breadcrumb đơn giản từ array
     */
    public static function fromArray(array $items): array
    {
        $breadcrumbs = [['name' => 'Trang chủ', 'url' => '/']];
        
        foreach ($items as $item) {
            $breadcrumbs[] = [
                'name' => $item['name'] ?? '',
                'url' => $item['url'] ?? '#',
            ];
        }
        
        return $breadcrumbs;
    }
}
