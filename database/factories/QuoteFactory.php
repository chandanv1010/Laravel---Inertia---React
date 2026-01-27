<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Quote>
 */
class QuoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'BG-' . Str::upper(Str::random(8)),
            'customer_id' => Customer::factory(),
            'customer_name' => fake()->name(),
            'customer_email' => fake()->email(),
            'customer_phone' => fake()->phoneNumber(),
            'customer_address' => fake()->address(),
            'total_amount' => 1000000,
            'discount_amount' => 0,
            'tax_amount' => 100000,
            'final_amount' => 1100000,
            'status' => 'draft',
            'user_id' => User::factory(),
        ];
    }
}
