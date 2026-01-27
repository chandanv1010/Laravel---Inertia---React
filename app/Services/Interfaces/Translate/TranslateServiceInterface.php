<?php 
namespace App\Services\Interfaces\Translate;

interface TranslateServiceInterface {
    
    /**
     * Lấy translation data cho một language cụ thể
     * 
     * @param string $module Module name (post, product, etc.)
     * @param int $recordId Record ID
     * @param int $languageId Language ID
     * @return array|null
     */
    public function getTranslationData(string $module, int $recordId, int $languageId): ?array;

    /**
     * Lấy default translation data (ngôn ngữ hiện tại) để làm reference
     * 
     * @param string $module Module name
     * @param int $recordId Record ID
     * @return array|null
     */
    public function getDefaultTranslationData(string $module, int $recordId): ?array;

    /**
     * Lưu translation cho một language
     * 
     * @param string $module Module name
     * @param int $recordId Record ID
     * @param int $languageId Language ID
     * @param array $translationData Translation data
     * @return bool
     */
    public function saveTranslation(string $module, int $recordId, int $languageId, array $translationData): bool;
}

