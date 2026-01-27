<?php

namespace Tests\Feature\Setting;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GeneralSettingTest extends TestCase
{
    // use RefreshDatabase; // Using existing DB state or manual cleanup if needed.

    public function test_general_setting_page_loads()
    {
        $user = User::factory()->create();
        
        // Mock authorization to bypass the check and reach the controller logic
        // The controller uses $this->authorize('modules', ...), which calls Gate.
        // Or strictly, we can just allow all via Gate::define inside test, or partial mock.
        // A simple way is to define a Gate for 'modules' that returns true.
        
        \Illuminate\Support\Facades\Gate::define('modules', function ($user, $permission) {
            return true;
        });

        $response = $this->actingAs($user)->get('/backend/setting/general');

        $response->assertStatus(200);
    }
}
