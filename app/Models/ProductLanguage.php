<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasCanonical;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProductLanguage extends Pivot
{
    use HasCanonical;

    protected $guarded = [];

    protected function canonical(): Attribute {
        return Attribute::make(
            get: fn ($value) => $value,
            set: fn($value) => $this->formatCanonical($value)
        );
    }

}

