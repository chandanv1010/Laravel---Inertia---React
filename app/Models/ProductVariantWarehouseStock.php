<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariantWarehouseStock extends Model
{
    protected $table = 'product_variant_warehouse_stocks';

    protected $fillable = [
        'product_variant_id',
        'warehouse_id',
        'stock_quantity',
        'storage_location',
    ];

    protected $casts = [
        'stock_quantity' => 'integer',
    ];

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id', 'id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id', 'id');
    }
}
