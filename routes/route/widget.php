<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Widget\WidgetController;

/*
|--------------------------------------------------------------------------
| Widget Routes
|--------------------------------------------------------------------------
*/

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::prefix('widget')->name('widget.')->group(function () {
        Route::get('/', [WidgetController::class, 'index'])->name('index');
        Route::get('/create', [WidgetController::class, 'create'])->name('create');
        Route::post('/', [WidgetController::class, 'store'])->name('store');
        Route::get('/{id}/edit', [WidgetController::class, 'edit'])->name('edit');
        Route::put('/{id}', [WidgetController::class, 'update'])->name('update');
        Route::delete('/{id}', [WidgetController::class, 'destroy'])->name('destroy');
        
        // AJAX Search
        Route::get('/search-model', [WidgetController::class, 'searchModel'])->name('searchModel');
    });
});
