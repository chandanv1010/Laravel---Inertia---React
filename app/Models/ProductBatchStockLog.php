<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductBatchStockLog extends Model
{
    protected $table = 'product_batch_stock_logs';

    protected $fillable = [
        'product_batch_id',
        'product_id',
        'product_variant_id',
        'warehouse_id',
        'before_stock',
        'change_stock',
        'after_stock',
        'reason',
        'user_id',
        'transaction_type',
    ];

    protected $casts = [
        'before_stock' => 'integer',
        'change_stock' => 'integer',
        'after_stock' => 'integer',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ProductBatch::class, 'product_batch_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }
}
