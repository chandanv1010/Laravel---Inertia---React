<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Setting\TaxSettingController;
use App\Http\Controllers\Backend\V1\Setting\SettingHubController;
use App\Http\Controllers\Backend\V1\Setting\GeneralSettingController;

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::get('setting/general', [GeneralSettingController::class, 'index'])->name('setting.general');
    Route::put('setting/general', [GeneralSettingController::class, 'update'])->name('setting.general.update');
    Route::patch('setting/general', [GeneralSettingController::class, 'update'])->name('setting.general.update');
    Route::get('setting/payment-methods', [SettingHubController::class, 'paymentMethods'])->name('setting.payment-methods'); // Redirects to payment-methods.index
    Route::get('setting/quote-template', [SettingHubController::class, 'quoteTemplate'])->name('setting.quote-template');
    Route::get('setting/shipping', [SettingHubController::class, 'shipping'])->name('setting.shipping');

    Route::get('setting/tax', [TaxSettingController::class, 'index'])->name('setting.tax.index');
    Route::post('setting/tax', [TaxSettingController::class, 'update'])->name('setting.tax.update');
});

