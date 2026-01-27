<?php 
namespace App\Services\Interfaces\Product;
use App\Services\Interfaces\BaseServiceInterface;
use Illuminate\Http\Request;

interface ProductBatchServiceInterface extends BaseServiceInterface{
    
    /**
     * Get batches for a product
     * 
     * @param int $productId
     * @return array
     */
    public function getBatchesForProduct(int $productId): array;

    /**
     * Get batches for a variant
     * 
     * @param int $variantId
     * @return array
     */
    public function getBatchesForVariant(int $variantId): array;

    /**
     * Ensure default batch exists for a product
     * 
     * @param int $productId
     * @return array
     */
    public function ensureDefaultBatchForProduct(int $productId): array;

    /**
     * Ensure default batch exists for a variant
     * 
     * @param int $variantId
     * @return array
     */
    public function ensureDefaultBatchForVariant(int $variantId): array;

    /**
     * Store batches for a product
     * 
     * @param Request $request
     * @param int $productId
     * @return bool
     */
    public function storeBatchesForProduct(Request $request, int $productId): bool;

    /**
     * Store batches for a variant
     * 
     * @param Request $request
     * @param int $variantId
     * @return bool
     */
    public function storeBatchesForVariant(Request $request, int $variantId): bool;

    /**
     * Update batch stock
     * 
     * @param Request $request
     * @param int $batchId
     * @return bool
     */
    public function updateBatchStock(Request $request, int $batchId): bool;

    /**
     * Transfer stock between warehouses
     * 
     * @param Request $request
     * @param int $batchId
     * @return array
     */
    public function transferStock(Request $request, int $batchId): array;

    /**
     * Get batch detail with logs
     * 
     * @param int $batchId
     * @param Request $request
     * @return array
     */
    public function getBatchDetail(int $batchId, Request $request): array;

    /**
     * Clear cache for product/variant
     * 
     * @param int $productId
     * @param int|null $variantId
     * @return void
     */
    public function clearCache(int $productId, ?int $variantId = null): void;
}

