<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoucherBuyXGetYItem extends Model
{
    protected $fillable = [
        'voucher_id',
        'item_type',
        'apply_type',
        'product_id',
        'product_variant_id',
        'product_catalogue_id',
        'quantity',
        'min_order_value',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'min_order_value' => 'decimal:2',
    ];

    /**
     * Get the voucher that owns this buy x get y item
     */
    public function voucher(): BelongsTo
    {
        return $this->belongsTo(Voucher::class, 'voucher_id');
    }

    /**
     * Get the product for this item
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Get the product variant for this item
     */
    public function product_variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * Get the product catalogue for this item
     */
    public function product_catalogue(): BelongsTo
    {
        return $this->belongsTo(ProductCatalogue::class, 'product_catalogue_id');
    }
}
