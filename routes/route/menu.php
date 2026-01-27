<?php

use App\Http\Controllers\Backend\V1\Menu\MenuController;
use Illuminate\Support\Facades\Route;

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    // Bulk actions (must be before resource routes)
    Route::delete('menu', [MenuController::class, 'bulkDestroy']);
    Route::put('menu', [MenuController::class, 'bulkUpdate']);
    Route::patch('menu', [MenuController::class, 'bulkUpdate']);
    Route::patch('menu/{id}/toggle/{field}', [MenuController::class, 'toggle']);
    
    // Custom routes
    Route::post('menu/reorder', [MenuController::class, 'reorder'])->name('menu.reorder');
    Route::get('menu/search-linkable', [MenuController::class, 'searchLinkableItems'])->name('menu.search-linkable');
    
    // Resource routes
    Route::resource('/menu', MenuController::class);
});
