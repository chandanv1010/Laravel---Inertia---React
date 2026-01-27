<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class CashReason extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'type',
        'description',
        'is_default',
        'publish',
        'order',
    ];

    protected $relationable = [];

    protected $casts = [
        'is_default' => 'boolean',
        'order' => 'integer',
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

    public function getRelationable(){
        return $this->relationable;
    }

    /**
     * Get transactions using this reason
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(CashTransaction::class, 'reason_id');
    }

    /**
     * Scope for receipt reasons
     */
    public function scopeReceipt($query)
    {
        return $query->where('type', 'receipt');
    }

    /**
     * Scope for payment reasons
     */
    public function scopePayment($query)
    {
        return $query->where('type', 'payment');
    }

    /**
     * Scope for default reasons
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }
}
