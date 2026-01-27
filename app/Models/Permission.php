<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class Permission extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'description',
        'canonical',
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

    public function user_catalogues(): BelongsToMany {
        return $this->belongsToMany(UserCatalogue::class, 'user_catalogue_permission');
    }

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];
}
