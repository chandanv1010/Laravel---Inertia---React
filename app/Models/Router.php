<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;
use App\Traits\HasCanonical;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Router extends Model
{
    use HasQuery, HasCanonical;

    protected $fillable = [
        'module',
        'canonical',
        'module_id',
        'next_component',
        'controller',
        'language_id',
        'routerable_id',
        'routerable_type',
        'redirect',
        'redirect_type'
    ];

    public function routerable(){
        return $this->morphTo();
    }


     protected function canonical(): Attribute {
        return Attribute::make(
            get: fn ($value) => $value,
            set: fn($value) => $this->formatCanonical($value)
        );
    }

   
}
