<?php

namespace App\Services\Interfaces\Attribute;

use App\Services\Interfaces\BaseServiceInterface;

interface AttributeCatalogueServiceInterface extends BaseServiceInterface
{
    /**
     * Find or create an attribute catalogue by translated name for a language.
     * Returns the catalogue id.
     */
    public function findOrCreateByName(string $name, int $languageId, int $userId): int;
}
