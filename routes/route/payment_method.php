<?php   

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Backend\V1\PaymentMethod\PaymentMethodController;

Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::get('payment-methods', [PaymentMethodController::class, 'index'])->name('payment-methods.index');
    Route::post('payment-methods/connect', [PaymentMethodController::class, 'connect'])->name('payment-methods.connect');
    Route::post('payment-methods/{id}/disconnect', [PaymentMethodController::class, 'disconnect'])->name('payment-methods.disconnect');
    Route::post('payment-methods/{id}/set-default', [PaymentMethodController::class, 'setDefault'])->name('payment-methods.set-default');
    Route::patch('payment-methods/{id}/set-default', [PaymentMethodController::class, 'setDefault'])->name('payment-methods.set-default');
    Route::post('payment-methods', [PaymentMethodController::class, 'store'])->name('payment-methods.store');
    Route::put('payment-methods/{id}', [PaymentMethodController::class, 'update'])->name('payment-methods.update');
    Route::patch('payment-methods/{id}', [PaymentMethodController::class, 'update'])->name('payment-methods.update');
    Route::delete('payment-methods/{id}', [PaymentMethodController::class, 'destroy'])->name('payment-methods.destroy');
    
    // Bank Accounts routes
    Route::post('payment-methods/bank-accounts', [PaymentMethodController::class, 'storeBankAccount'])->name('bank-accounts.store');
    Route::put('payment-methods/bank-accounts/{id}', [PaymentMethodController::class, 'updateBankAccount'])->name('bank-accounts.update');
    Route::delete('payment-methods/bank-accounts/{id}', [PaymentMethodController::class, 'destroyBankAccount'])->name('bank-accounts.destroy');
    
    // Manual Payment Methods routes
    Route::post('manual-payment-methods', [PaymentMethodController::class, 'storeManualPaymentMethod'])->name('manual-payment-methods.store');
    Route::put('manual-payment-methods/{id}', [PaymentMethodController::class, 'updateManualPaymentMethod'])->name('manual-payment-methods.update');
});

