<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariantWarehouseStockLog extends Model
{
    protected $table = 'product_variant_warehouse_stock_logs';

    protected $fillable = [
        'product_variant_id',
        'warehouse_id',
        'before_stock',
        'change_stock',
        'after_stock',
        'reason',
        'transaction_type',
        'user_id',
    ];

    protected $casts = [
        'before_stock' => 'integer',
        'change_stock' => 'integer',
        'after_stock' => 'integer',
        'user_id' => 'integer',
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
