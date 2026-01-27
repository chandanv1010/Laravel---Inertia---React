<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class Supplier extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'code',
        'email',
        'website',
        'phone',
        'tax_code',
        'fax',
        'address',
        'responsible_user_id',
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

    public function responsibleUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_user_id', 'id');
    }
}
