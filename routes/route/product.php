<?php   

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Backend\V1\Product\ProductCatalogueController;
use App\Http\Controllers\Backend\V1\Product\ProductController;
use App\Http\Controllers\Backend\V1\Product\ProductBrandController;
use App\Http\Controllers\Backend\V1\Product\ProductVariantController;
use App\Http\Controllers\Backend\V2\Product\ProductBatchController;


Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::delete('product_catalogue', [ProductCatalogueController::class, 'bulkDestroy']);
    Route::put('product_catalogue', [ProductCatalogueController::class, 'bulkUpdate']);
    Route::patch('product_catalogue', [ProductCatalogueController::class, 'bulkUpdate']);
    Route::patch('product_catalogue/{id}/toggle/{field}', [ProductCatalogueController::class, 'toggle']);
    Route::resource('/product_catalogue', ProductCatalogueController::class);


    Route::delete('product', [ProductController::class, 'bulkDestroy']);
    Route::put('product', [ProductController::class, 'bulkUpdate']);
    Route::patch('product', [ProductController::class, 'bulkUpdate']);
    Route::patch('product/{id}/toggle/{field}', [ProductController::class, 'toggle']);
    Route::resource('/product', ProductController::class);
    // Quick add product for import order
    Route::post('product/quick-add', [ProductController::class, 'quickAdd']);
    // Product warehouse stocks
    Route::patch('product/{product}/warehouse-stocks', [ProductController::class, 'updateWarehouseStocks']);
    Route::post('product/{product}/warehouse-stocks/transfer', [ProductController::class, 'transferWarehouseStock']);
    Route::get('product/{product}/stock-info', [ProductController::class, 'getStockInfo']);
    Route::get('product/{product}/stock-history', [ProductController::class, 'getStockHistory']);
    Route::get('product/{product}/variant/{variant}/stock-info', [ProductController::class, 'getVariantStockInfo']);
    // Product batches (lô sản phẩm)
    Route::get('product/{product}/batches', [ProductBatchController::class, 'index']);
    Route::post('product/{product}/batches', [ProductBatchController::class, 'store']);
    Route::post('product/{product}/batches/ensure-default', [ProductBatchController::class, 'ensureDefault']);
    Route::get('product-batches/{batch}/detail', [ProductBatchController::class, 'detail']);
    Route::patch('product-batches/{batch}', [ProductBatchController::class, 'update']);
    Route::post('product-batches/{batch}/transfer', [ProductBatchController::class, 'transfer']);
    Route::delete('product-batches/{batch}', [ProductBatchController::class, 'destroy']);

    Route::delete('product_brand', [ProductBrandController::class, 'bulkDestroy']);
    Route::put('product_brand', [ProductBrandController::class, 'bulkUpdate']);
    Route::patch('product_brand', [ProductBrandController::class, 'bulkUpdate']);
    Route::patch('product_brand/{id}/toggle/{field}', [ProductBrandController::class, 'toggle']);
    Route::resource('/product_brand', ProductBrandController::class);

    Route::delete('product_variant', [ProductVariantController::class, 'bulkDestroy']);
    Route::put('product_variant', [ProductVariantController::class, 'bulkUpdate']);
    Route::patch('product_variant', [ProductVariantController::class, 'bulkUpdate']);
    Route::patch('product_variant/{id}/toggle/{field}', [ProductVariantController::class, 'toggle']);
    Route::resource('/product_variant', ProductVariantController::class);
    
    // Product variant detail page (nested under product)
    Route::get('product/{product}/variants/{variant}', [ProductVariantController::class, 'show']);
    // Product variant warehouse stocks
    Route::patch('product-variant/{variant}/warehouse-stocks', [ProductVariantController::class, 'updateWarehouseStocks']);
    // Product variant batches (lô sản phẩm cho variant)
    Route::get('product-variant/{variant}/batches', [ProductBatchController::class, 'indexVariant']);
    Route::post('product-variant/{variant}/batches', [ProductBatchController::class, 'storeVariant']);
    Route::post('product-variant/{variant}/batches/ensure-default', [ProductBatchController::class, 'ensureDefaultVariant']);

});

