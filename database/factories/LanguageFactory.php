<?php

namespace Database\Factories;

use App\Models\Language;
use Illuminate\Database\Eloquent\Factories\Factory;

class LanguageFactory extends Factory
{
    protected $model = Language::class;

    public function definition(): array
    {
        return [
            'name' => 'Vietnamese',
            'canonical' => 'vi',
            'image' => '/userfiles/image/languages/Flag_of_Vietnam_svg.png',
            'publish' => '2',
            'description' => '',
            'user_id' => \App\Models\User::factory(),
        ];
    }
}

