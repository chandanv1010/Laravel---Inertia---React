<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasQuery;

class Log extends Model
{
    use HasQuery;

    protected $fillable = [
        'user_id',
        'action',
        'module',
        'record_id',
        'record_type',
        'ip_address',
        'user_agent',
        'description',
        'old_data',
        'new_data',
        'changes',
        'status',
        'error_message',
        'route',
        'method',
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
        'changes' => 'array',
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

    /**
     * Get the user that performed the action
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the record that was acted upon (polymorphic)
     */
    public function record()
    {
        return $this->morphTo('record', 'record_type', 'record_id');
    }
}
