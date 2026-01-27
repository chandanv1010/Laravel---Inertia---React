<?php   

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Backend\V1\Setting\LanguageController;
use App\Http\Controllers\Backend\V1\Setting\LogController;


Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::delete('language', [LanguageController::class, 'bulkDestroy']);
    Route::put('language', [LanguageController::class, 'bulkUpdate']);
    Route::patch('language', [LanguageController::class, 'bulkUpdate']);
    Route::patch('language/{id}/toggle/{field}', [LanguageController::class, 'toggle']);
    Route::resource('language', LanguageController::class);

    // Log routes
    Route::get('log', [LogController::class, 'index'])->name('log.index');
    Route::post('log/refresh-cache', [LogController::class, 'refreshCache'])->name('log.refresh-cache');
    Route::post('log/delete-older-than', [LogController::class, 'deleteOlderThan'])->name('log.delete-older-than');
    Route::post('log/delete-last-n-days', [LogController::class, 'deleteLastNDays'])->name('log.delete-last-n-days');
});
