<?php 
namespace App\Services\Interfaces\Product;
use App\Services\Interfaces\BaseServiceInterface;

interface ProductCatalogueServiceInterface extends BaseServiceInterface{
    public function initNestedset(array $params = []);
    public function getNestedsetDropdown();
    public function getDropdown();
    
    /**
     * Lấy danh sách danh mục với cấu trúc phân cấp cho frontend
     */
    public function getCategoriesForSlider(): array;
    
    /**
     * Lấy các filter options cho danh mục (price range, attributes, etc.)
     */
    public function getFiltersForCatalogue(int $catalogueId): array;
    
    /**
     * Lấy tất cả danh mục dạng flat với depth cho filter sidebar
     */
    public function getAllCategoriesFlat(): array;

    public function mapProductsForFrontend(array $products, int $languageId, array $catalogueIds): array;
}
