<?php

namespace App\Helpers;

use App\Models\Router;

/**
 * CatalogueHelper
 * Helper class để transform dữ liệu danh mục cho frontend
 */
class CatalogueHelper
{
    /**
     * Transform catalogue model thành array cho frontend
     *
     * @param mixed $catalogue Model danh mục (ProductCatalogue, PostCatalogue, etc.)
     * @param mixed $catalogueLang Language pivot object
     * @param Router|null $router Router model để lấy canonical URL
     * @param array $defaults Default values cho name và description
     * @return array
     */
    public static function transform(
        $catalogue,
        $catalogueLang = null,
        ?Router $router = null,
        array $defaults = []
    ): array {
        $defaultName = $defaults['name'] ?? 'Danh mục';
        $defaultDescription = $defaults['description'] ?? '';

        return [
            'id' => $catalogue->id,
            'name' => $catalogueLang?->pivot?->name ?? $defaultName,
            'description' => $catalogueLang?->pivot?->description ?? $defaultDescription,
            'image' => $catalogue->image,
            'icon' => $catalogue->icon,
            'canonical' => $router?->canonical ?? null,
        ];
    }

    /**
     * Transform catalogue với language ID
     * Tự động lấy language từ catalogue->languages
     *
     * @param mixed $catalogue Model danh mục với relationship languages
     * @param int $languageId ID của ngôn ngữ cần lấy
     * @param Router|null $router Router model
     * @param array $defaults Default values
     * @return array
     */
    public static function transformWithLanguageId(
        $catalogue,
        int $languageId,
        ?Router $router = null,
        array $defaults = []
    ): array {
        $catalogueLang = $catalogue->languages?->firstWhere('id', $languageId);
        
        return self::transform($catalogue, $catalogueLang, $router, $defaults);
    }

    /**
     * Transform danh sách catalogues
     *
     * @param iterable $catalogues Collection các catalogues
     * @param int $languageId ID ngôn ngữ
     * @param callable|null $routerResolver Callback để lấy router cho mỗi catalogue
     * @return array
     */
    public static function transformMany(
        iterable $catalogues,
        int $languageId,
        ?callable $routerResolver = null
    ): array {
        $result = [];
        
        foreach ($catalogues as $catalogue) {
            $router = $routerResolver ? $routerResolver($catalogue) : null;
            $result[] = self::transformWithLanguageId($catalogue, $languageId, $router);
        }
        
        return $result;
    }
}
