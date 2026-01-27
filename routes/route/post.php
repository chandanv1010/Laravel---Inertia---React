<?php   

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Backend\V1\Post\PostCatalogueController;
use App\Http\Controllers\Backend\V1\Post\PostController;


Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::delete('post_catalogue', [PostCatalogueController::class, 'bulkDestroy']);
    Route::put('post_catalogue', [PostCatalogueController::class, 'bulkUpdate']);
    Route::patch('post_catalogue', [PostCatalogueController::class, 'bulkUpdate']);
    Route::patch('post_catalogue/{id}/toggle/{field}', [PostCatalogueController::class, 'toggle']);
    Route::resource('/post_catalogue', PostCatalogueController::class);


    Route::delete('post', [PostController::class, 'bulkDestroy']);
    Route::put('post', [PostController::class, 'bulkUpdate']);
    Route::patch('post', [PostController::class, 'bulkUpdate']);
    Route::patch('post/{id}/toggle/{field}', [PostController::class, 'toggle']);
    Route::resource('/post', PostController::class);

});
