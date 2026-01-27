<?php   

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Backend\V1\Warehouse\WarehouseController;
use App\Http\Controllers\Backend\V1\Warehouse\SupplierController;
use App\Http\Controllers\Backend\V1\Warehouse\ImportOrderController;
use App\Http\Controllers\Backend\V1\Warehouse\ReturnImportOrderController;


Route::prefix('backend')->middleware(['auth', 'verified', 'setBackendLocale'])->group(function () {
    Route::patch('warehouse/{id}/toggle/{field}', [WarehouseController::class, 'toggle']);
    Route::delete('warehouse', [WarehouseController::class, 'bulkDestroy']);
    Route::put('warehouse', [WarehouseController::class, 'bulkUpdate']);
    Route::patch('warehouse', [WarehouseController::class, 'bulkUpdate']);
    Route::resource('warehouse', WarehouseController::class);
    
    // Supplier routes
    Route::patch('supplier/{id}/toggle/{field}', [SupplierController::class, 'toggle']);
    Route::delete('supplier', [SupplierController::class, 'bulkDestroy']);
    Route::put('supplier', [SupplierController::class, 'bulkUpdate']);
    Route::patch('supplier', [SupplierController::class, 'bulkUpdate']);
    Route::get('supplier/{id}/info', [SupplierController::class, 'info'])->name('supplier.info');
    Route::resource('supplier', SupplierController::class);
    
    // Import Order routes
    Route::patch('import-order/{id}/toggle/{field}', [ImportOrderController::class, 'toggle']);
    Route::delete('import-order', [ImportOrderController::class, 'bulkDestroy']);
    Route::put('import-order', [ImportOrderController::class, 'bulkUpdate']);
    Route::patch('import-order', [ImportOrderController::class, 'bulkUpdate']);
    Route::post('import-order/{id}/import-to-stock', [ImportOrderController::class, 'importToStock'])->name('import_order.import_to_stock');
    Route::post('import-order/{import_order}/cancel', [ImportOrderController::class, 'cancel'])->name('import_order.cancel');
    Route::post('import-order/{import_order}/restore', [ImportOrderController::class, 'restore'])->name('import_order.restore');
    Route::post('import-order/{id}/payment', [ImportOrderController::class, 'payment'])->name('import_order.payment');
    Route::resource('import-order', ImportOrderController::class);

    // Return Import Order routes - Trả hàng NCC
    Route::get('return-import-order/import-orders', [ReturnImportOrderController::class, 'getImportOrdersForReturn'])->name('return_import_order.get_import_orders');
    Route::get('return-import-order/import-order/{id}/details', [ReturnImportOrderController::class, 'getImportOrderDetails'])->name('return_import_order.get_import_order_details');
    Route::post('return-import-order/by-order/{importOrderId}', [ReturnImportOrderController::class, 'returnByOrder'])->name('return_import_order.return_by_order');
    Route::post('return-import-order/without-order', [ReturnImportOrderController::class, 'returnWithoutOrder'])->name('return_import_order.return_without_order');
    Route::post('return-import-order/{id}/export-to-stock', [ReturnImportOrderController::class, 'exportToStock'])->name('return_import_order.export_to_stock');
    Route::post('return-import-order/{id}/confirm-refund', [ReturnImportOrderController::class, 'confirmRefund'])->name('return_import_order.confirm_refund');
    Route::resource('return-import-order', ReturnImportOrderController::class);
});
