<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'type',
        'status',
        'is_default',
        'provider',
        'config',
        'description',
        'icon',
        'order',
        'user_id',
    ];

    protected $casts = [
        'config' => 'array',
        'is_default' => 'boolean',
        'order' => 'integer',
    ];

    /**
     * Relationship với BankAccount (nhiều tài khoản cho chuyển khoản)
     */
    public function bankAccounts()
    {
        return $this->hasMany(BankAccount::class);
    }

    /**
     * Relationship với ManualPaymentMethod (1-1)
     */
    public function manualPaymentMethod()
    {
        return $this->hasOne(ManualPaymentMethod::class);
    }
}
