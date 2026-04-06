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
require __DIR__.'/route/order.php';
require __DIR__.'/route/banner.php';
require __DIR__.'/route/review.php';
require __DIR__.'/route/widget.php';

// Frontend API routes
use App\Http\Controllers\Frontend\Cart\CartController;

// Frontend Auth Routes (Customers)
use App\Http\Controllers\Frontend\Auth\Customer\LoginController as CustomerLogin;
use App\Http\Controllers\Frontend\Auth\Customer\RegisterController as CustomerRegister;
use App\Http\Controllers\Frontend\Auth\Customer\LogoutController as CustomerLogout;
use App\Http\Controllers\Frontend\Customer\ProfileController;
use App\Http\Controllers\Frontend\Checkout\CheckoutController;

Route::middleware('guest:customer')->group(function () {
    Route::get('signin', [CustomerLogin::class, 'show'])->name('signin');
    Route::post('signin', [CustomerLogin::class, 'login'])->name('signin.action');
    Route::get('signup', [CustomerRegister::class, 'show'])->name('signup');
    Route::post('signup', [CustomerRegister::class, 'register'])->name('signup.action');
});

Route::middleware('auth:customer')->group(function () {
    Route::post('signout', [CustomerLogin::class, 'logout'])->name('signout');

    // Customer Profile Routes
    Route::group(['prefix' => 'customer', 'as' => 'customer.'], function () {
        Route::get('/profile', [ProfileController::class, 'index'])->name('profile');
        Route::post('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::get('/change-password', [ProfileController::class, 'password'])->name('password');
        Route::post('/change-password', [ProfileController::class, 'updatePassword'])->name('password.update');
        Route::get('/orders', [ProfileController::class, 'orders'])->name('orders');
    });

    // Checkout Routes (Simplified)
    Route::get('/checkout', [CheckoutController::class, 'index'])->name('checkout');
    Route::post('/checkout', [CheckoutController::class, 'process'])->name('checkout.process');
    Route::get('/checkout/payment/{orderCode}', [CheckoutController::class, 'payment'])->name('checkout.payment');
    Route::get('/checkout/success/{orderCode}', [CheckoutController::class, 'success'])->name('checkout.success');
});

// Checkout Page View (Canonical)
Route::middleware('auth:customer')->group(function () {
    Route::get('thanh-toan.html', [CheckoutController::class, 'index'])->name('checkout.page');
});

Route::prefix('cart')->name('cart.')->group(function () {
    Route::get('/', [CartController::class, 'index'])->name('index');
    Route::post('add', [CartController::class, 'store'])->name('add');
    Route::put('update', [CartController::class, 'update'])->name('update');
    Route::delete('remove', [CartController::class, 'destroy'])->name('remove');
    Route::delete('clear', [CartController::class, 'clear'])->name('clear');
    Route::get('vouchers', [CartController::class, 'vouchers'])->name('vouchers');
    Route::post('apply-voucher', [CartController::class, 'applyVoucher'])->name('applyVoucher');
});

// Cart Page View (Protected)
Route::middleware('auth:customer')->group(function () {
    Route::get('gio-hang.html', [CartController::class, 'view'])->name('cart.page');
});


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
