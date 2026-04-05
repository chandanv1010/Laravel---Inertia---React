<?php

namespace App\Services\Interfaces\Cart;

interface CartServiceInterface
{
    public function get(): array;
    public function add(int $productId, ?int $variantId = null, int $quantity = 1, ?int $promoId = null): array;
    public function addCombo(int $comboId): array;
    public function update(string $rowId, int $quantity): array;
    public function remove(string $rowId): array;
    public function count(): int;
    public function clear(): void;
    public function recalculate(): void;
    public function applyVoucher(string $code): array;
    public function mergeGuestCartToDatabase(): void;
}
