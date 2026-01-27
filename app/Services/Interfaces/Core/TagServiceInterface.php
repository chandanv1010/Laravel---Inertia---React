<?php

namespace App\Services\Interfaces\Core;

use App\Services\Interfaces\BaseServiceInterface;
use Illuminate\Http\Request;

interface TagServiceInterface extends BaseServiceInterface
{
    public function getDropdown();
    public function create(Request $request);
    public function update(int $id, Request $request);

    /**
     * Resolve tag IDs by tag names (create missing tags).
     *
     * @param array $names
     * @param string $type
     * @return array<int>
     */
    public function resolveIdsByNames(array $names, string $type = 'product'): array;
}
