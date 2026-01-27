<?php

namespace App\Services\Impl\V1\Setting;

use App\Repositories\Setting\SettingRepo;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Setting\TaxSettingServiceInterface;

class TaxSettingService extends BaseCacheService implements TaxSettingServiceInterface
{
    protected string $cacheStrategy = 'default';
    protected string $module = 'settings_tax';

    protected $repository;

    public function __construct(SettingRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static
    {
        // Not used for this settings module (we persist via updateOrCreate per-key).
        $this->modelData = [];
        return $this;
    }

    public function get(): array
    {
        // Defaults
        $defaults = [
            'enabled' => false,
            'price_includes_tax' => false,
            'default_tax_on_sale' => false,
            'default_tax_on_purchase' => false,
            'sale_tax_rate' => 0.0,
            'purchase_tax_rate' => 0.0,
        ];

        // Use cache strategy from BaseCacheService (dataset is overkill, default ok)
        $records = $this->repository->getModel()
            ->newQuery()
            ->where('group', 'tax')
            ->get(['key', 'value']);

        $data = $defaults;
        foreach ($records as $row) {
            $key = (string) ($row->key ?? '');
            if ($key === '') continue;
            $val = $row->value;
            $data[$key] = $val;
        }

        // Cast and normalize
        return [
            'enabled' => (bool) ($data['enabled'] ?? false),
            'price_includes_tax' => (bool) ($data['price_includes_tax'] ?? false),
            'default_tax_on_sale' => (bool) ($data['default_tax_on_sale'] ?? false),
            'default_tax_on_purchase' => (bool) ($data['default_tax_on_purchase'] ?? false),
            'sale_tax_rate' => (float) ($data['sale_tax_rate'] ?? 0),
            'purchase_tax_rate' => (float) ($data['purchase_tax_rate'] ?? 0),
        ];
    }

    public function update(array $payload): bool
    {
        $data = [
            'enabled' => (bool) ($payload['enabled'] ?? false),
            'price_includes_tax' => (bool) ($payload['price_includes_tax'] ?? false),
            'default_tax_on_sale' => (bool) ($payload['default_tax_on_sale'] ?? false),
            'default_tax_on_purchase' => (bool) ($payload['default_tax_on_purchase'] ?? false),
            'sale_tax_rate' => (float) ($payload['sale_tax_rate'] ?? 0),
            'purchase_tax_rate' => (float) ($payload['purchase_tax_rate'] ?? 0),
        ];

        foreach ($data as $key => $value) {
            $this->repository->getModel()->newQuery()->updateOrCreate(
                ['group' => 'tax', 'key' => $key],
                ['value' => $value, 'type' => is_bool($value) ? 'bool' : (is_numeric($value) ? 'float' : 'json')]
            );
        }

        $this->invalidateCache();
        return true;
    }
}

