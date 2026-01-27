<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class Menu extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'code',
        'position',
        'description',
        'publish',
        'user_id',
        'order',
    ];

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
        'order' => 'integer',
    ];

    protected $relationable = ['items', 'creator'];

    public function getRelationable()
    {
        return $this->relationable;
    }

    /**
     * Get the user that created the menu
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get top-level menu items (no parent)
     */
    public function items(): HasMany
    {
        return $this->hasMany(MenuItem::class)->whereNull('parent_id')->orderBy('order');
    }

    /**
     * Get all menu items (including nested)
     */
    public function allItems(): HasMany
    {
        return $this->hasMany(MenuItem::class)->orderBy('order');
    }

    /**
     * Get nested items with children loaded
     */
    public function getNestedItemsAttribute()
    {
        return $this->items()->with('children')->get();
    }
}
