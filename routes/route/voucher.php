<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\Voucher\VoucherController;

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::put('voucher/voucher', [VoucherController::class, 'bulkUpdate']);
    Route::patch('voucher/voucher', [VoucherController::class, 'bulkUpdate']);
    Route::get('voucher/voucher/generate-code', [VoucherController::class, 'generateCode'])->name('voucher.voucher.generate-code');
    Route::resource('/voucher/voucher', VoucherController::class);
});

