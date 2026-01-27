<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class UserCatalogue extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'canonical',
        'description',
        'publish',
        'user_id',
        'deleted_at'
    ];

    // Belong To many
    protected $relationable = [
        'permissions'
    ];

    public function creators(): BelongsTo{
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function users(): BelongsToMany {
        return $this->belongsToMany(User::class, 'user_catalogue_user');
    }

    public function permissions(): BelongsToMany {
        return $this->belongsToMany(Permission::class, 'user_catalogue_permission');
    }

    public function getRelationable(){
        return $this->relationable;
    }

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];
}
