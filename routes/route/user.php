<?php   

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Backend\V1\User\UserCatalogueController;
use App\Http\Controllers\Backend\V1\User\UserController;
use App\Http\Controllers\Backend\V1\Permission\PermissionController;


Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::delete('user_catalogue', [UserCatalogueController::class, 'bulkDestroy']);
    Route::put('user_catalogue', [UserCatalogueController::class, 'bulkUpdate']);
    Route::patch('user_catalogue', [UserCatalogueController::class, 'bulkUpdate']);
    Route::patch('user_catalogue/{id}/toggle/{field}', [UserCatalogueController::class, 'toggle']);
    Route::resource('/user_catalogue', UserCatalogueController::class);

    Route::delete('user', [UserController::class, 'bulkDestroy']);
    Route::put('user', [UserController::class, 'bulkUpdate']);
    Route::patch('user', [UserController::class, 'bulkUpdate']);
    Route::patch('user/{id}/toggle/{field}', [UserController::class, 'toggle']);
    Route::resource('/user', UserController::class);


    Route::delete('permission', [PermissionController::class, 'bulkDestroy']);
    Route::put('permission', [PermissionController::class, 'bulkUpdate']);
    Route::patch('permission', [PermissionController::class, 'bulkUpdate']);
    Route::patch('permission/{id}/toggle/{field}', [PermissionController::class, 'toggle']);
    Route::resource('/permission', PermissionController::class);

});
