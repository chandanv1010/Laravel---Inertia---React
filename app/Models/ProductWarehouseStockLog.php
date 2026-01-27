<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductWarehouseStockLog extends Model
{
    protected $table = 'product_warehouse_stock_logs';

    protected $fillable = [
        'product_id',
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
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
