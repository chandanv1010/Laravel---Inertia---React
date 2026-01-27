<?php

use App\Http\Controllers\Backend\V1\Core\TagController;
use Illuminate\Support\Facades\Route;

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::get('tags/search', [TagController::class, 'search'])->name('tags.search');
    Route::resource('tags', TagController::class)->except(['show']);
});
