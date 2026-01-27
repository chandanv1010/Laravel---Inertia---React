<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class Warehouse extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'code',
        'address',
        'phone',
        'email',
        'manager',
        'description',
        'publish',
        'user_id',
    ];

    protected $relationable = [];

    protected $casts = [
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
}
