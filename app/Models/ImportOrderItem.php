<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'import_order_id',
        'product_id',
        'product_variant_id',
        'quantity',
        'unit_price',
        'discount',
        'discount_type',
        'batch_allocations',
        'total_price',
        'notes',
        'order',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_price' => 'decimal:2',
        'order' => 'integer',
        'batch_allocations' => 'array',
    ];

    public function importOrder(): BelongsTo
    {
        return $this->belongsTo(ImportOrder::class, 'import_order_id', 'id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'id');
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id', 'id');
    }
}
