<?php

namespace App\Services\Impl\V1\Attribute;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\Attribute\AttributeCatalogueServiceInterface;
use App\Repositories\Attribute\AttributeCatalogueRepo;
use Illuminate\Support\Str;

class AttributeCatalogueService extends BaseService implements AttributeCatalogueServiceInterface
{
    public function __construct(AttributeCatalogueRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }
    
    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        return $this;
    }

    public function findOrCreateByName(string $name, int $languageId, int $userId): int
    {
        $name = trim((string) $name);
        if ($name === '') return 0;
        $languageId = (int) $languageId;
        $userId = (int) $userId;

        // Find by translation name in pivot table for the given language
        $model = $this->repository->getModel()
            ->whereHas('languages', function ($q) use ($languageId, $name) {
                $q->where('languages.id', $languageId)
                  ->where('attribute_catalogue_language.name', $name);
            })
            ->first();

        if (!$model) {
            $model = $this->repository->getModel()->create([
                'type' => Str::slug($name, '_'),
                'order' => 0,
                'publish' => '2',
                'user_id' => $userId,
            ]);

            $model->languages()->syncWithoutDetaching([
                $languageId => [
                    'name' => $name,
                    'description' => '',
                    'canonical' => Str::slug($name),
                ],
            ]);
        }

        return (int) ($model->id ?? 0);
    }
}
