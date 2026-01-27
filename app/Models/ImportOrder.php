<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class ImportOrder extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'code',
        'supplier_id',
        'warehouse_id',
        'responsible_user_id',
        'expected_import_date',
        'reference',
        'notes',
        'tags',
        'total_amount',
        'discount',
        'discount_type',
        'import_cost',
        'import_costs',
        'amount_to_pay',
        'status',
        'payment_status',
        'payment_method',
        'payment_amount',
        'payment_date',
        'payment_reference',
        'user_id',
    ];

    protected $relationable = [];

    protected $casts = [
        'expected_import_date' => 'date',
        'payment_date' => 'date',
        'total_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'import_cost' => 'decimal:2',
        'amount_to_pay' => 'decimal:2',
        'payment_amount' => 'decimal:2',
        'import_costs' => 'array',
        'created_at' => 'date:d-m-Y',
        'updated_at' => 'date:d-m-Y',
    ];

    public function getRelationable(){
        return $this->relationable;
    }

    public function creators(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id', 'id');
    }

    public function responsibleUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_user_id', 'id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ImportOrderItem::class, 'import_order_id', 'id');
    }

    public function history(): HasMany
    {
        return $this->hasMany(ImportOrderHistory::class, 'import_order_id', 'id');
    }
}
