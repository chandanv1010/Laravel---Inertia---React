<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class CustomerCatalogue extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'description',
        'order',
        'publish',
        'user_id',
        'deleted_at',
    ];

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

    protected $relationable = [];

    public function getRelationable(){
        return $this->relationable;
    }

    public function creators(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
