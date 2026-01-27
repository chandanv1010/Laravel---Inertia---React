<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\CashBook\CashTransactionController;
use App\Http\Controllers\Backend\V1\CashBook\CashReasonController;

Route::middleware(['auth', 'verified', 'setBackendLocale'])->prefix('backend/cash-book')->name('cash-book.')->group(function () {
    
    // Cash Transactions
    Route::prefix('transaction')->name('transaction.')->group(function () {
        Route::get('/', [CashTransactionController::class, 'index'])->name('index');
        Route::get('/create', [CashTransactionController::class, 'create'])->name('create');
        Route::get('/create-receipt', [CashTransactionController::class, 'createReceipt'])->name('create-receipt');
        Route::get('/create-payment', [CashTransactionController::class, 'createPayment'])->name('create-payment');
        Route::get('/create-transfer', [CashTransactionController::class, 'createTransfer'])->name('create-transfer');
        Route::get('/generate-code', [CashTransactionController::class, 'generateCode'])->name('generate-code');
        Route::get('/search-partners', [CashTransactionController::class, 'searchPartners'])->name('search-partners');
        Route::get('/statistics', [CashTransactionController::class, 'statistics'])->name('statistics');
        Route::get('/export', [CashTransactionController::class, 'export'])->name('export');
        Route::post('/', [CashTransactionController::class, 'store'])->name('store');
        Route::get('/{id}', [CashTransactionController::class, 'show'])->name('show');
        Route::get('/{id}/edit', [CashTransactionController::class, 'edit'])->name('edit');
        Route::put('/{id}', [CashTransactionController::class, 'update'])->name('update');
        Route::delete('/{id}', [CashTransactionController::class, 'destroy'])->name('destroy');
        Route::post('/bulk-update', [CashTransactionController::class, 'bulkUpdate'])->name('bulk-update');
    });

    // Cash Reasons
    Route::prefix('reason')->name('reason.')->group(function () {
        Route::get('/', [CashReasonController::class, 'index'])->name('index');
        Route::get('/create', [CashReasonController::class, 'create'])->name('create');
        Route::post('/', [CashReasonController::class, 'store'])->name('store');
        Route::get('/{id}', [CashReasonController::class, 'show'])->name('show');
        Route::get('/{id}/edit', [CashReasonController::class, 'edit'])->name('edit');
        Route::put('/{id}', [CashReasonController::class, 'update'])->name('update');
        Route::delete('/{id}', [CashReasonController::class, 'destroy'])->name('destroy');
        Route::post('/bulk-update', [CashReasonController::class, 'bulkUpdate'])->name('bulk-update');
        Route::get('/dropdown', [CashReasonController::class, 'dropdown'])->name('dropdown');
    });
});
