<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\ProductVariant;

class ProductBatch extends Model
{
    protected $table = 'product_batches';

    protected $fillable = [
        'product_id',
        'product_variant_id',
        'code',
        'manufactured_at',
        'expired_at',
        'is_default',
        'status',
    ];

    protected $casts = [
        'manufactured_at' => 'date:Y-m-d',
        'expired_at' => 'date:Y-m-d',
        'is_default' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function warehouseStocks(): HasMany
    {
        return $this->hasMany(ProductBatchWarehouse::class, 'product_batch_id');
    }

    public function stockLogs(): HasMany
    {
        return $this->hasMany(ProductBatchStockLog::class, 'product_batch_id');
    }

    /**
     * Get total stock quantity across all warehouses
     */
    public function getTotalStockQuantityAttribute(): int
    {
        return (int) $this->warehouseStocks()->sum('stock_quantity');
    }

    /**
     * Get stock quantity for a specific warehouse
     */
    public function getStockQuantityForWarehouse(?int $warehouseId): int
    {
        if (!$warehouseId) {
            return $this->total_stock_quantity;
        }
        return (int) $this->warehouseStocks()
            ->where('warehouse_id', $warehouseId)
            ->sum('stock_quantity');
    }
}

