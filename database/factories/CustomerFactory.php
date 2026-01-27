<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Customer>
 */
class CustomerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'publish' => 1,
            // 'name' accessor usually combines first_name and last_name, but in the Quote test I accessed ->name provided by the controller select or factory.
            // Wait, the QuoteController helper select('id', 'name') assumes there is a 'name' column or attribute.
            // Let's check if the Customer model has a 'name' accessor or column.
            // The fillable shows 'first_name', 'last_name'. 
            // In QuoteController: Customer::select('id', 'name', ...). This might be a BUG if 'name' column doesn't exist.
            // Checking the Customer model again...
        ];
    }
}
