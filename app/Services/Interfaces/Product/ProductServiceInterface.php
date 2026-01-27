<?php 
namespace App\Services\Interfaces\Product;
use App\Services\Interfaces\BaseServiceInterface;
use Illuminate\Http\Request;

interface ProductServiceInterface extends BaseServiceInterface{
    
    /**
     * Format request data cho frontend React (hỗ trợ MultiSelect hiển thị checked state)
     * 
     * @param Request $request
     * @return array
     */
    public function formatRequestDataForFrontend(Request $request): array;

    /**
     * Update warehouse stocks for a product and create logs
     * 
     * @param Request $request
     * @param int $productId
     * @return bool
     */
    public function updateWarehouseStocks(Request $request, int $productId): bool;

    /**
     * Recalculate and sync warehouse stock based on batches
     * 
     * @param int $productId
     * @return void
     */
    public function syncWarehouseStockFromBatches(int $productId): void;

    /**
     * Clear cache for a product
     * 
     * @param int $id
     * @return void
     */
    public function clearCache(int $id): void;

    /**
     * Transfer warehouse stock for a basic product (not batch-managed)
     * 
     * @param int $productId
     * @param int $fromWarehouseId
     * @param int $toWarehouseId
     * @param int $quantity
     * @param string|null $reason
     * @return bool
     */
    public function transferWarehouseStock(int $productId, int $fromWarehouseId, int $toWarehouseId, int $quantity, ?string $reason = null): bool;

    /**
     * Get products for promotion selection (with variants, formatted for frontend)
     * 
     * @param int $limit
     * @return array
     */
    /**
     * Get detailed product information for frontend (with all relations)
     * 
     * @param int $id
     * @param int $languageId
     * @return mixed
     */
    public function getProductDetail(int $id, int $languageId);
}

