<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasQuery;

class ImportOrderHistory extends Model
{
    use HasFactory, HasQuery;

    protected $fillable = [
        'import_order_id',
        'user_id',
        'action',
        'description',
        'data',
    ];

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
        'data' => 'array',
    ];

    public function importOrder(): BelongsTo
    {
        return $this->belongsTo(ImportOrder::class, 'import_order_id', 'id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
