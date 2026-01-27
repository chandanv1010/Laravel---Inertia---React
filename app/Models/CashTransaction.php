<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class CashTransaction extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'transaction_code',
        'transaction_type',
        'payment_method',
        'partner_group',
        'partner_id',
        'partner_name',
        'reason_id',
        'amount',
        'description',
        'store_id',
        'recipient_store_id',
        'transaction_date',
        'reference_code',
        'attachments',
        'user_id',
        'publish',
        'order',
    ];

    protected $relationable = ['reason', 'creator', 'store', 'recipientStore'];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
        'attachments' => 'array',
        'order' => 'integer',
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

    public function getRelationable(){
        return $this->relationable;
    }

    /**
     * Get the reason for this transaction
     */
    public function reason(): BelongsTo
    {
        return $this->belongsTo(CashReason::class, 'reason_id');
    }

    /**
     * Get the user who created this transaction
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the store for this transaction
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * Get the recipient store for transfer transactions
     */
    public function recipientStore(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'recipient_store_id');
    }

    /**
     * Get the partner (polymorphic)
     * This would need to be implemented based on partner_group
     */
    public function partner()
    {
        // This is a simplified version
        // In real implementation, you'd check partner_group and return the appropriate model
        // For now, we'll leave this as a placeholder
        return null;
    }

    /**
     * Scope for receipt transactions
     */
    public function scopeReceipt($query)
    {
        return $query->where('transaction_type', 'receipt');
    }

    /**
     * Scope for payment transactions
     */
    public function scopePayment($query)
    {
        return $query->where('transaction_type', 'payment');
    }

    /**
     * Scope for transfer transactions
     */
    public function scopeTransfer($query)
    {
        return $query->where('transaction_type', 'transfer');
    }

    /**
     * Scope for cash transactions
     */
    public function scopeCash($query)
    {
        return $query->where('payment_method', 'cash');
    }

    /**
     * Scope for bank transactions
     */
    public function scopeBank($query)
    {
        return $query->where('payment_method', 'bank');
    }

    /**
     * Scope for date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('transaction_date', [$startDate, $endDate]);
    }

    /**
     * Get formatted transaction code based on type
     */
    public static function generateTransactionCode(string $type): string
    {
        $prefix = match($type) {
            'receipt' => 'PT',
            'payment' => 'PC',
            'transfer' => 'CQ',
            default => 'TX',
        };

        $date = date('ymd');
        $latest = static::where('transaction_code', 'like', "{$prefix}-{$date}-%")
            ->latest('id')
            ->first();

        if ($latest) {
            $lastNumber = (int) substr($latest->transaction_code, -4);
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "{$prefix}-{$date}-{$newNumber}";
    }
}
