<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasQuery;

class BankAccount extends Model
{
    use HasFactory, HasQuery;

    protected $fillable = [
        'payment_method_id',
        'bank_name',
        'account_number',
        'account_holder_name',
        'note',
        'is_active',
        'order',
        'user_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
    ];

    protected $relationable = ['paymentMethod'];

    public function getRelationable()
    {
        return $this->relationable;
    }

    /**
     * Relationship với PaymentMethod
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }
}
