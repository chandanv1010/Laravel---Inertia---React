<?php 
namespace App\Services\Interfaces\Product;
use App\Services\Interfaces\BaseServiceInterface;
use Illuminate\Http\Request;

interface ProductVariantServiceInterface extends BaseServiceInterface{
    public function ensureDefaultVariant(int $productId): void;

    /**
     * Sync variants for a product (create/update/delete missing) and sync attribute pivot ids.
     *
     * @param int $productId
     * @param array $variants
     * @param array $attributeIdsByIndex map: variant index => attribute_id[]
     * @return array<int> processed variant IDs
     */
    public function syncForProduct(int $productId, array $variants, array $attributeIdsByIndex = []): array;

    /**
     * Update warehouse stocks for a variant and create logs
     */
    public function updateWarehouseStocks(Request $request, int $variantId): bool;

    /**
     * Sync warehouse stock from batches for a variant
     */
    public function syncWarehouseStockFromBatches(int $variantId): void;

    /**
     * Clear cache for a variant
     */
    public function clearCache(int $id): void;
}

