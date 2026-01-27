<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use App\Traits\HasQuery;

class Tag extends Model
{
    use HasQuery;

    protected $fillable = [
        'name',
        'slug',
        'type',
        'description'
    ];

    // Polymorphic relationship
    public function products(): MorphToMany
    {
        return $this->morphedByMany(Product::class, 'taggable');
    }

    public function posts(): MorphToMany
    {
        return $this->morphedByMany(Post::class, 'taggable');
    }
}
