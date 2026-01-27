<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;
use App\Models\AttributeLanguage;

class Attribute extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'attribute_catalogue_id',
        'value',
        'color_code',
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

    public function attribute_catalogue(): BelongsTo{
        return $this->belongsTo(AttributeCatalogue::class, 'attribute_catalogue_id', 'id');
    }

    public function languages(): BelongsToMany{
        return $this->belongsToMany(Language::class, 'attribute_language')->using(AttributeLanguage::class)->withPivot([
            'name',
            'description',
        ]);
    }

    public function current_languages(): BelongsToMany {
        return $this->belongsToMany(Language::class, 'attribute_language')
            ->where(['language_id' => config('app.language_id')])
            ->withPivot([
                'name',
                'description',
            ]); 
    }

    public function product_variants(): BelongsToMany{
        return $this->belongsToMany(ProductVariant::class, 'product_variant_attributes', 'attribute_id', 'product_variant_id');
    }

    public function getRelationable(){
        return $this->relationable;
    }

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

}

