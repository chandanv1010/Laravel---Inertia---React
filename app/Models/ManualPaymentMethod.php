<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManualPaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_method_id',
        'payment_instructions',
        'allow_use_when_paying',
        'create_receipt_immediately',
        'beneficiary_account_id',
        'beneficiary_account_ids',
        'user_id',
    ];

    protected $casts = [
        'allow_use_when_paying' => 'boolean',
        'create_receipt_immediately' => 'boolean',
        'beneficiary_account_ids' => 'array',
    ];

    /**
     * Relationship với PaymentMethod
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /**
     * Relationship với BankAccount (tài khoản thụ hưởng - single, backward compatibility)
     */
    public function beneficiaryAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'beneficiary_account_id');
    }

    /**
     * Helper method để lấy danh sách BankAccounts từ beneficiary_account_ids
     * Lưu ý: beneficiary_account_ids được lưu dưới dạng JSON array, không dùng relationship
     */
    public function getBeneficiaryAccountsAttribute()
    {
        $accountIds = $this->beneficiary_account_ids ?? [];
        if (empty($accountIds)) {
            return collect([]);
        }
        return BankAccount::whereIn('id', $accountIds)->get();
    }

}
