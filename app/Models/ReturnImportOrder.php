<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class ReturnImportOrder extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'code',
        'import_order_id',
        'supplier_id',
        'warehouse_id',
        'responsible_user_id',
        'return_type', // by_order, without_order
        'return_reason',
        'total_amount',
        'discount',
        'return_cost',
        'return_costs',
        'deduction',
        'deduction_reason',
        'refund_amount',
        'refund_status', // received, later
        'payment_method',
        'refund_date',
        'refund_reference',
        'export_to_stock',
        'status', // pending, completed, cancelled
        'notes',
        'tags',
        'user_id',
    ];

    protected $relationable = [];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'return_cost' => 'decimal:2',
        'return_costs' => 'array',
        'deduction' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'export_to_stock' => 'boolean',
        'refund_date' => 'date',
        'tags' => 'array',
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

    public function getRelationable()
    {
        return $this->relationable;
    }

    public function creators(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function importOrder(): BelongsTo
    {
        return $this->belongsTo(ImportOrder::class, 'import_order_id', 'id');
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
        return $this->hasMany(ReturnImportOrderItem::class, 'return_import_order_id', 'id');
    }
}
