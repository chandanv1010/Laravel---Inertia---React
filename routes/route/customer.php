<?php   

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Backend\V1\Customer\CustomerCatalogueController;
use App\Http\Controllers\Backend\V1\Customer\CustomerController;


Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::delete('customer_catalogue', [CustomerCatalogueController::class, 'bulkDestroy']);
    Route::put('customer_catalogue', [CustomerCatalogueController::class, 'bulkUpdate']);
    Route::patch('customer_catalogue', [CustomerCatalogueController::class, 'bulkUpdate']);
    Route::patch('customer_catalogue/{id}/toggle/{field}', [CustomerCatalogueController::class, 'toggle']);
    Route::resource('/customer_catalogue', CustomerCatalogueController::class);


    Route::delete('customer', [CustomerController::class, 'bulkDestroy']);
    Route::put('customer', [CustomerController::class, 'bulkUpdate']);
    Route::patch('customer', [CustomerController::class, 'bulkUpdate']);
    Route::patch('customer/{id}/toggle/{field}', [CustomerController::class, 'toggle']);
    Route::resource('/customer', CustomerController::class);

});
