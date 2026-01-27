<?php

namespace App\Services\Impl\V1\Core;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Core\TagServiceInterface;
use App\Repositories\Core\TagRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use App\Helpers\DropdownHelper;
use Illuminate\Support\Str;

class TagService extends BaseCacheService implements TagServiceInterface
{
    // Cache strategy: 'default' phù hợp cho tags vì ít thay đổi
    protected string $cacheStrategy = 'default';
    protected string $module = 'tags';

    protected $repository;

    protected $with = [];
    protected $simpleFilter = [];
    protected $searchFields = ['name'];
    protected $sort = ['name', 'asc'];

    public function __construct(TagRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }
    
    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        // Tags don't have user_id yet, can be added later if needed
        // $this->modelData['user_id'] = Auth::id();
        return $this;
    }

    public function getDropdown()
    {
        // Sử dụng paginate với type='all' để tận dụng cache strategy
        $request = new Request([
            'type' => 'all',
            'sort' => 'name,asc'
        ]);
        
        $records = $this->paginate($request);

        // Sử dụng DropdownHelper, Tag không phải multiple language
        return DropdownHelper::transform($records, [
            'valueKey' => 'id',
            'labelKey' => 'name',
            'isMultipleLanguage' => false,
        ]);
    }

    public function create(Request $request)
    {
        return $this->save($request);
    }

    public function update(int $id, Request $request)
    {
        return $this->save($request, $id);
    }

    public function resolveIdsByNames(array $names, string $type = 'product'): array
    {
        if (!is_array($names)) return [];

        $ids = [];
        foreach ($names as $name) {
            $name = trim((string) $name);
            if ($name === '') continue;

            $slug = Str::slug($name);

            // NOTE: This stays inside TagService to keep ProductService clean.
            $tag = $this->repository->getModel()->firstOrCreate(
                ['slug' => $slug, 'type' => $type],
                ['name' => $name, 'description' => null]
            );

            if ($tag?->id) $ids[] = (int) $tag->id;
        }

        return array_values(array_unique($ids));
    }
}
