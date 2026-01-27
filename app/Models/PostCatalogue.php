<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use App\Traits\HasCanonical;
use App\Models\PostCatalogueLanguage;

class PostCatalogue extends Model
{
    use SoftDeletes, HasQuery, HasCanonical;

    protected $fillable = [
        'parent_id',
        'image',
        'icon',
        'album',
        'type',
        'script',
        'iframe',
        'publish',
        'user_id',
        'order',
        'deleted_at',
        'robots',
        'auto_translate'
    ];

    // Belong To many
    protected $relationable = [
       'languages'
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
        'album' => 'json',
        'auto_translate' => 'boolean'
    ];

    public function languages(): BelongsToMany{
        return $this->belongsToMany(Language::class, 'post_catalogue_language')->using(PostCatalogueLanguage::class)->withPivot([
            'name',
            'description',
            'content',
            'canonical',
            'meta_title',
            'meta_keyword',
            'meta_description',
        ]);
    }


    public function current_languages(): BelongsToMany {
        return $this->belongsToMany(Language::class, 'post_catalogue_language')->where(['language_id' => config('app.language_id')])->withPivot([
            'name',
            'description',
            'content',
            'canonical',
            'meta_title',
            'meta_keyword',
            'meta_description',
        ]); 
    }

    public function routers(): MorphOne{
        return $this->morphOne(Router::class, 'routerable');
    }
}
