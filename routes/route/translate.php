<?php   

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Translate\TranslateController;

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    // Translate routes - sử dụng method chuẩn Laravel
    Route::get('{module}/{id}/translate/{languageId}', [TranslateController::class, 'create'])->name('translate.create');
    Route::post('{module}/{id}/translate/{languageId}', [TranslateController::class, 'store'])->name('translate.store');
    Route::get('{module}/{id}/translate/{languageId}/edit', [TranslateController::class, 'edit'])->name('translate.edit');
    Route::match(['put', 'patch'], '{module}/{id}/translate/{languageId}', [TranslateController::class, 'update'])->name('translate.update');
});

