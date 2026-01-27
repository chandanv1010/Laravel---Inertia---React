<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Review\ReviewController;

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::get('review/search-entities', [ReviewController::class, 'searchEntities'])->name('review.search_entities');
    Route::delete('review', [ReviewController::class, 'bulkDestroy']);
    Route::patch('review', [ReviewController::class, 'bulkUpdate']);
    Route::patch('review/{id}/toggle/{field}', [ReviewController::class, 'toggle']);
    Route::resource('/review', ReviewController::class);
});
