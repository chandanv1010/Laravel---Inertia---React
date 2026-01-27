<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductBatchWarehouse extends Model
{
    protected $table = 'product_batch_warehouses';

    protected $fillable = [
        'product_batch_id',
        'warehouse_id',
        'stock_quantity',
    ];

    protected $casts = [
        'stock_quantity' => 'integer',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ProductBatch::class, 'product_batch_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }
}
