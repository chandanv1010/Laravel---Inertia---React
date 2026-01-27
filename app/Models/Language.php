<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class Language extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'canonical',
        'image',
        'description',
        'publish',
        'user_id',
        'deleted_at'
    ];

    // Belong To many
    protected $relationable = [
       
    ];

    public function creators(): BelongsTo{
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function getRelationable(){
        return $this->relationable;
    }

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];
}
