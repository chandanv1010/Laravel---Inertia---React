<?php

namespace Database\Factories;

use App\Models\ProductBrand;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductBrandFactory extends Factory
{
    protected $model = ProductBrand::class;

    public function definition(): array
    {
        return [
            'order' => 0,
            'publish' => '2',
            'user_id' => 1,
            'image' => null,
            'icon' => null,
            'album' => [],
        ];
    }
}

