<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'variant_id',
        'type',
        'combo_group_id',
        'product_name',
        'variant_name',
        'product_image',
        'variant_image',
        'quantity',
        'price',
        'original_price',
        'total',
        'promotions_snapshot',
    ];

    protected $casts = [
        'promotions_snapshot' => 'array',
        'price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    /**
     * Relationship with Order
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Relationship with Product
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Relationship with ProductVariant
     */
    public function variant()
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
