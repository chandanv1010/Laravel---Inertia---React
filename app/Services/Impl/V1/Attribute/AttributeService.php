<?php

namespace App\Services\Impl\V1\Attribute;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\Attribute\AttributeServiceInterface;
use App\Repositories\Attribute\AttributeRepo;

class AttributeService extends BaseService implements AttributeServiceInterface
{
    public function __construct(AttributeRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }
    
    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        return $this;
    }

    public function findOrCreateValue(int $catalogueId, string $value, int $languageId, int $userId): int
    {
        $catalogueId = (int) $catalogueId;
        $value = trim((string) $value);
        $languageId = (int) $languageId;
        $userId = (int) $userId;

        if ($catalogueId <= 0 || $value === '') return 0;

        $model = $this->repository->getModel()
            ->where('attribute_catalogue_id', $catalogueId)
            ->where('value', $value)
            ->first();

        if (!$model) {
            $model = $this->repository->getModel()->create([
                'attribute_catalogue_id' => $catalogueId,
                'value' => $value,
                'order' => 0,
                'publish' => '2',
                'user_id' => $userId,
            ]);

            $model->languages()->syncWithoutDetaching([
                $languageId => [
                    'name' => $value,
                    'description' => '',
                ],
            ]);
        }

        return (int) ($model->id ?? 0);
    }
}
