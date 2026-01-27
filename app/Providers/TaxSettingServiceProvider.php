<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\Interfaces\Setting\TaxSettingServiceInterface;
use App\Services\Impl\V1\Setting\TaxSettingService;

class TaxSettingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(TaxSettingServiceInterface::class, TaxSettingService::class);
    }
}

