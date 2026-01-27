<?php   

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Router\RouterController;

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::get('/router', [RouterController::class, 'index'])->name('router.index');
});
