<?php

use App\Http\Controllers\Backend\V1\DashboardController;
use App\Http\Controllers\Backend\V1\Image\ImageTempController;
use App\Http\Controllers\Media\ThumbnailController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\Product;

use App\Http\Controllers\Frontend\HomeController;

Route::get('/', [HomeController::class, 'index'])->name('home');

// Public thumbnail endpoint for CKFinder/userfiles images
Route::get('/thumb', ThumbnailController::class)->name('media.thumb');

// Language Switcher Route
Route::get('language-switch/{locale}', function ($locale) {
    session()->put('app_locale', $locale);
    return back();
})->name('language.switch');

Route::middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('upload-image-temp', [ImageTempController::class, 'upload'])->name('upload.temp');
    Route::delete('upload-image-temp/{id}', [ImageTempController::class, 'destroy'])->where('id', '.*')->name('upload.destroy');
});


require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/route/translate.php'; // Đặt translate route TRƯỚC các route resource để tránh conflict
require __DIR__.'/route/user.php';
require __DIR__.'/route/setting.php';
require __DIR__.'/route/system.php';
require __DIR__.'/route/tax_setting.php';
require __DIR__.'/route/router.php';
require __DIR__.'/route/post.php';
require __DIR__.'/route/product.php';
require __DIR__.'/route/core.php';
require __DIR__.'/route/warehouse.php';
require __DIR__.'/route/customer.php';
require __DIR__.'/route/payment_method.php';
require __DIR__.'/route/quote.php';
require __DIR__.'/route/promotion.php';
require __DIR__.'/route/voucher.php';
require __DIR__.'/route/cash_book.php';
require __DIR__.'/route/menu.php';
require __DIR__.'/route/banner.php';
require __DIR__.'/route/review.php';
require __DIR__.'/route/widget.php';

// Frontend API routes
use App\Http\Controllers\Frontend\Cart\CartController;

Route::prefix('cart')->name('cart.')->group(function () {
    Route::get('/', [CartController::class, 'index'])->name('index');
    Route::post('add', [CartController::class, 'store'])->name('add');
    Route::put('update', [CartController::class, 'update'])->name('update');
    Route::delete('remove', [CartController::class, 'destroy'])->name('remove');
    Route::delete('clear', [CartController::class, 'clear'])->name('clear');
    Route::get('vouchers', [CartController::class, 'vouchers'])->name('vouchers');
    Route::post('apply-voucher', [CartController::class, 'applyVoucher'])->name('applyVoucher');
});

// Cart Page View
Route::get('gio-hang.html', [CartController::class, 'view'])->name('cart.page');


// Frontend Router - Catch canonical URLs (must be last)
use App\Http\Controllers\Frontend\Core\RouterController;

// Pagination route: /canonical/trang-X.html
Route::get('{canonical}/trang-{page}.html', [RouterController::class, 'dispatch'])
    ->where('canonical', '[a-z0-9\-\/]+')
    ->where('page', '[0-9]+')
    ->name('frontend.router.paginated');

// Main canonical route
Route::get('{canonical}.html', [RouterController::class, 'dispatch'])
    ->where('canonical', '[a-z0-9\-\/]+')
    ->name('frontend.router');

// Fallback for 404
Route::get('404', function () {
    return Inertia::render('frontend/not-found');
})->name('404');
