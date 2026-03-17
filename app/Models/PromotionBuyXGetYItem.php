<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromotionBuyXGetYItem extends Model
{
    protected $table = 'promotion_buy_x_get_y_items';

    protected $fillable = [
        'promotion_id',
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
     * Get the promotion that owns this buy x get y item
     */
    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class, 'promotion_id');
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
