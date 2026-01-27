<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class Slide extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'banner_id',
        'name',
        'background_image',
        'background_color',
        'background_position_x',
        'background_position_y',
        'elements',
        'url',
        'target',
        'order',
        'publish',
        'start_date',
        'end_date',
        'user_id',
    ];

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'order' => 'integer',
        'background_position_x' => 'integer',
        'background_position_y' => 'integer',
        'elements' => 'array', // Auto-cast JSON to array
    ];

    protected $relationable = ['banner', 'creator'];

    public function getRelationable()
    {
        return $this->relationable;
    }

    /**
     * Get the banner this slide belongs to
     */
    public function banner(): BelongsTo
    {
        return $this->belongsTo(Banner::class);
    }

    /**
     * Get the user that created the slide
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Check if slide is currently active (within schedule)
     */
    public function isActive(): bool
    {
        if ($this->publish !== '2') {
            return false;
        }

        $now = now();

        if ($this->start_date && $this->start_date > $now) {
            return false;
        }

        if ($this->end_date && $this->end_date < $now) {
            return false;
        }

        return true;
    }

}
