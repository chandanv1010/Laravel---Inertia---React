<?php

namespace App\Services\Interfaces\Product;

use App\Services\Interfaces\BaseServiceInterface;

interface PricingTierServiceInterface extends BaseServiceInterface
{
    /**
     * Replace-all sync pricing tiers for a product.
     *
     * @param int $productId
     * @param array $tiers
     * @return bool
     */
    public function syncForProduct(int $productId, array $tiers): bool;
}

