<?php

namespace App\Services\Interfaces\Cart;

interface CartServiceInterface
{
    public function get(): array;
    public function add(int $productId, ?int $variantId = null, int $quantity = 1): array;
    public function update(string $rowId, int $quantity): array;
    public function remove(string $rowId): array;
    public function count(): int;
    public function clear(): void;
}
