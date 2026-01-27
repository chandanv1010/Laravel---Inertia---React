<?php

use App\Http\Controllers\Backend\V1\Banner\BannerController;
use Illuminate\Support\Facades\Route;

Route::prefix('backend')->middleware(['auth', 'verified'])->group(function () {
    // Bulk actions (before resource)
    Route::delete('banner', [BannerController::class, 'bulkDestroy']);
    Route::put('banner', [BannerController::class, 'bulkUpdate']);
    Route::patch('banner', [BannerController::class, 'bulkUpdate']);
    Route::patch('banner/{id}/toggle/{field}', [BannerController::class, 'toggle']);
    
    // API endpoint for frontend
    Route::get('banner/code/{code}', [BannerController::class, 'getByCode'])->name('banner.code');
    
    // Resource routes
    Route::resource('/banner', BannerController::class);
});
