<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        Gate::define('modules', function($user, $permission){
            if($user->publish === 1) return false;

            $user->loadMissing('user_catalogues.permissions');
            $permissions = $user->user_catalogues->flatMap(fn ($catalogue) => $catalogue->permissions)->pluck('canonical')->unique()->values();
            return $permissions->contains($permission);

        });
    }
}
