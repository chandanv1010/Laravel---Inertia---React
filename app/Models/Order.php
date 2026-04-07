<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\OrderItem;

use App\Traits\HasQuery;

class Order extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'order_code',
        'customer_id',
        'total_amount',
        'subtotal',
        'discount_total',
        'voucher_discount',
        'shipping_fee',
        'payment_method_id',
        'payment_status',
        'order_status',
        'shipping_address',
        'customer_name',
        'customer_phone',
        'notes',
        'summary_snapshot',
    ];

    protected $casts = [
        'summary_snapshot' => 'array',
        'total_amount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'voucher_discount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
    ];

    /**
     * Relationship with Customer
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Relationship with PaymentMethod
     */
    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /**
     * Relationship with OrderItems
     */
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Relationship names that can be handled automatically by BaseService
     */
    public function getRelationable(): array
    {
        return []; // No many-to-many relations to sync automatically yet
    }
}
