<?php

namespace App\Services\Interfaces\Attribute;

use App\Services\Interfaces\BaseServiceInterface;

interface AttributeServiceInterface extends BaseServiceInterface
{
    /**
     * Find or create an attribute value under a catalogue.
     * Returns the attribute id.
     */
    public function findOrCreateValue(int $catalogueId, string $value, int $languageId, int $userId): int;
}
