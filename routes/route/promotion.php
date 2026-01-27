<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Promotion\PromotionController;

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::put('promotion/promotion', [PromotionController::class, 'bulkUpdate']);
    Route::patch('promotion/promotion', [PromotionController::class, 'bulkUpdate']);
    Route::patch('promotion/promotion/{id}/toggle/{field}', [PromotionController::class, 'toggle']);
    Route::resource('/promotion/promotion', PromotionController::class);
});

