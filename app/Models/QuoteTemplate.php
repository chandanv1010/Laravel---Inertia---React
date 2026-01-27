<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuoteTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'content',
        'styles',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class, 'template_id');
    }
}
