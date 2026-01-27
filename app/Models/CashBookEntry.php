<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class CashBookEntry extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'code',
        'entry_type',
        'amount',
        'description',
        'category',
        'from_account_id',
        'to_account_id',
        'reference',
        'entry_date',
        'status',
        'user_id',
    ];

    protected $relationable = [];

    protected $casts = [
        'amount' => 'decimal:2',
        'entry_date' => 'date',
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

    public function getRelationable(){
        return $this->relationable;
    }

    public function creators(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function fromAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'from_account_id', 'id');
    }

    public function toAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'to_account_id', 'id');
    }
}
