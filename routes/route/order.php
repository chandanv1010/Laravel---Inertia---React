<?php  
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Order\OrderController;

Route::middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::group(['prefix' => 'backend', 'as' => 'order.'], function () {
        Route::resource('order', OrderController::class);
    });
});
