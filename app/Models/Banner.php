<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class Banner extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'code',
        'position',
        'description',
        'width',
        'height',
        'publish',
        'user_id',
        'order',
    ];

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
        'order' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    protected $relationable = ['slides', 'creator'];

    public function getRelationable()
    {
        return $this->relationable;
    }

    /**
     * Get the user that created the banner
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get all slides for this banner
     */
    public function slides(): HasMany
    {
        return $this->hasMany(Slide::class)->orderBy('order');
    }

    /**
     * Get published slides only
     */
    public function publishedSlides(): HasMany
    {
        return $this->hasMany(Slide::class)
            ->where('publish', '2')
            ->where(function ($query) {
                $query->whereNull('start_date')
                    ->orWhere('start_date', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            })
            ->orderBy('order');
    }

    /**
     * Get banner by code
     */
    public static function getByCode(string $code)
    {
        return static::where('code', $code)
            ->where('publish', '2')
            ->with('publishedSlides')
            ->first();
    }
}
