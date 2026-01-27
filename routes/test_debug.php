<?php

use Illuminate\Support\Facades\Route;
use App\Models\Product;

Route::get('/test-product-update', function () {
    try {
        $product = Product::first();
        if (!$product) return 'No product found';
        
        $oldValue = $product->expired_warning_days;
        $newValue = ($oldValue ?? 0) + 1;
        
        $product->expired_warning_days = $newValue;
        $product->save();
        
        $product->refresh();
        
        return [
            'id' => $product->id,
            'old' => $oldValue,
            'set_to' => $newValue,
            'actual_after_refresh' => $product->expired_warning_days,
            'fillable' => $product->getFillable(),
            'attributes' => $product->getAttributes(),
        ];
    } catch (\Throwable $e) {
        return [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ];
    }
});
