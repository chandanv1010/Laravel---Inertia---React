<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;
use App\Models\AttributeCatalogueLanguage;

class AttributeCatalogue extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'type',
        'order',
        'publish',
        'user_id',
        'deleted_at'
    ];

    protected $relationable = [
        'languages'
    ];

    public function creators(): BelongsTo{
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function languages(): BelongsToMany{
        return $this->belongsToMany(Language::class, 'attribute_catalogue_language')->using(AttributeCatalogueLanguage::class)->withPivot([
            'name',
            'description',
            'canonical',
        ]);
    }

    public function current_languages(): BelongsToMany {
        return $this->belongsToMany(Language::class, 'attribute_catalogue_language')
            ->where(['language_id' => config('app.language_id')])
            ->withPivot([
                'name',
                'description',
                'canonical',
            ]); 
    }

    public function attributes(): HasMany{
        return $this->hasMany(Attribute::class, 'attribute_catalogue_id', 'id');
    }

    public function getRelationable(){
        return $this->relationable;
    }

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

}

