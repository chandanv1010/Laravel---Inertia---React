<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;
use App\Models\ProductBrandLanguage;

class ProductBrand extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'image',
        'icon',
        'album',
        'order',
        'publish',
        'user_id',
        'robots',
        'auto_translate',
        'deleted_at'
    ];

    // Belong To many
    protected $relationable = [
        'languages'
    ];

    public function creators(): BelongsTo{
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function languages(): BelongsToMany{
        return $this->belongsToMany(Language::class, 'product_brand_language')->using(ProductBrandLanguage::class)->withPivot([
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
        return $this->belongsToMany(Language::class, 'product_brand_language')
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

    public function products(): HasMany{
        return $this->hasMany(Product::class, 'product_brand_id', 'id');
    }

    public function routers(): MorphOne{
        return $this->morphOne(Router::class, 'routerable');
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

}

