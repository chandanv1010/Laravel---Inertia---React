<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReturnImportOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'return_import_order_id',
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

    public function returnImportOrder(): BelongsTo
    {
        return $this->belongsTo(ReturnImportOrder::class, 'return_import_order_id', 'id');
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
