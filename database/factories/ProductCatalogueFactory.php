<?php

namespace Database\Factories;

use App\Models\ProductCatalogue;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductCatalogueFactory extends Factory
{
    protected $model = ProductCatalogue::class;

    public function definition(): array
    {
        return [
            'parent_id' => null,
            'lft' => 0,
            'rgt' => 0,
            'level' => 0,
            'order' => 0,
            'publish' => '2',
            'user_id' => 1,
            'image' => null,
            'icon' => null,
            'album' => [],
            'robots' => null,
        ];
    }
}

