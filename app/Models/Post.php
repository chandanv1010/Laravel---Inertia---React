<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;
use App\Models\PostLanguage;
use App\Models\Router;

class Post extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'post_catalogue_id',
        'image',
        'icon',
        'album',
        'script',
        'iframe',
        'qrcode',
        'order',
        'publish',
        'user_id',
        'robots',
        'auto_translate',
        'deleted_at'
    ];

    // Belong To many
    protected $relationable = [
        'languages',
        'post_catalogues'
    ];

    public function creators(): BelongsTo{
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function post_catalogue(): BelongsTo{
        return $this->belongsTo(PostCatalogue::class, 'post_catalogue_id', 'id');
    }

    public function languages(): BelongsToMany{
        return $this->belongsToMany(Language::class, 'post_language')->using(PostLanguage::class)->withPivot([
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
        return $this->belongsToMany(Language::class, 'post_language')
            ->where(['language_id' => config('app.language_id')])
            ->withPivot([
                'name',
                'description',
                'content',
                'canonical',
                'meta_title',
                'meta_keyword',
                'meta_description',
            ]); 
    }

    public function post_catalogues(): BelongsToMany{
        return $this->belongsToMany(PostCatalogue::class, 'post_catalogue_post', 'post_id', 'post_catalogue_id');
    }

    public function routers(): MorphOne{
        return $this->morphOne(Router::class, 'routerable');
    }

    public function getRelationable(){
        return $this->relationable;
    }

    public function reviews(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
        'album' => 'json',
        'auto_translate' => 'boolean'
    ];

    public function getNameAttribute()
    {
        return $this->current_languages->first()?->pivot?->name;
    }

}
