<?php

namespace App\Services\Impl\V1\Product;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Product\PricingTierServiceInterface;
use App\Repositories\Product\PricingTierRepo;

class PricingTierService extends BaseCacheService implements PricingTierServiceInterface
{
    // Cache strategy: 'dataset' phù hợp vì tiers liên quan product_id filter
    protected string $cacheStrategy = 'dataset';
    protected string $module = 'pricing_tiers';

    protected $repository;

    public function __construct(PricingTierRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static
    {
        // Not used directly - syncForProduct works with repository/model internally
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request?->only($fillable) ?? [];
        return $this;
    }

    public function syncForProduct(int $productId, array $tiers): bool
    {
        if ($productId <= 0) return false;
        if (!is_array($tiers)) return true;

        // Replace-all strategy (assume caller manages transaction scope)
        $this->repository->getModel()->where('product_id', $productId)->delete();

        foreach ($tiers as $tier) {
            if (!is_array($tier)) continue;

            $min = (int) ($tier['min_quantity'] ?? 0);
            if ($min <= 0) continue;

            $max = array_key_exists('max_quantity', $tier) && $tier['max_quantity'] !== null && $tier['max_quantity'] !== ''
                ? (int) $tier['max_quantity']
                : null;
            $price = (float) ($tier['price'] ?? 0);

            $this->repository->getModel()->create([
                'product_id' => $productId,
                'min_quantity' => $min,
                'max_quantity' => $max,
                'price' => $price,
            ]);
        }

        // Invalidate caches for this module
        $this->invalidateCache();
        return true;
    }
}

