<?php

// TODO: Quote module controllers not implemented yet
// Uncomment when QuoteController and QuoteExportController are created

// use App\Http\Controllers\Backend\Quote\QuoteController;
// use App\Http\Controllers\Backend\Quote\QuoteExportController;
// use App\Http\Controllers\Backend\Setting\QuoteTemplateController;
// use Illuminate\Support\Facades\Route;

// Route::middleware(['auth', 'verified', 'setBackendLocale'])->prefix('backend')->name('backend.')->group(function () {
    
//     // Quotes CRUD
//     Route::resource('quotes', QuoteController::class);

//     // Quote Exports
//     Route::get('quotes/{quote}/export-pdf', [QuoteExportController::class, 'exportPdf'])->name('quotes.export.pdf');
//     Route::get('quotes/{quote}/export-word', [QuoteExportController::class, 'exportWord'])->name('quotes.export.word');

//     // Quote Templates (TODO: Implement QuoteTemplateController)
//     // Route::prefix('setting')->name('setting.')->group(function () {
//     //     Route::resource('quote-template', QuoteTemplateController::class);
//     // });
// });

