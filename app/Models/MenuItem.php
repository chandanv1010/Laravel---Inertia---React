<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class MenuItem extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'menu_id',
        'parent_id',
        'name',
        'url',
        'target',
        'icon',
        'linkable_type',
        'linkable_id',
        'publish',
        'order',
    ];

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
        'order' => 'integer',
    ];

    protected $relationable = ['menu', 'parent', 'children', 'linkable'];

    public function getRelationable()
    {
        return $this->relationable;
    }

    /**
     * Get the menu this item belongs to
     */
    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }

    /**
     * Get the parent item
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'parent_id');
    }

    /**
     * Get child items
     */
    public function children(): HasMany
    {
        return $this->hasMany(MenuItem::class, 'parent_id')->orderBy('order');
    }

    /**
     * Get all nested children recursively
     */
    public function allChildren(): HasMany
    {
        return $this->children()->with('allChildren');
    }

    /**
     * Get the linked model (Post, PostCatalogue, ProductCatalogue, etc.)
     */
    public function linkable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get computed URL - from linkable or custom url
     */
    public function getComputedUrlAttribute(): string
    {
        if ($this->url) {
            return $this->url;
        }

        if ($this->linkable) {
            // If linkable has router relationship
            if (method_exists($this->linkable, 'routers') && $this->linkable->routers) {
                return '/' . $this->linkable->routers->canonical;
            }
        }

        return '#';
    }
    /**
     * Get all translations
     */
    public function languages()
    {
        return $this->belongsToMany(Language::class, 'menu_item_languages', 'menu_item_id', 'language_id')
            ->withPivot('name', 'canonical', 'url')
            ->withTimestamps();
    }

    /**
     * Get translation for current locale
     */
    public function current_languages()
    {
        return $this->belongsToMany(Language::class, 'menu_item_languages', 'menu_item_id', 'language_id')
            ->withPivot('name', 'canonical', 'url')
            ->withTimestamps()
            ->where('language_id', config('app.language_id')); // Fixed: was 'current_language_id'
    }

    /**
     * Accessor for translated name
     */
    public function getNameAttribute($value)
    {
        if ($this->relationLoaded('current_languages') && $this->current_languages->isNotEmpty()) {
            return $this->current_languages->first()->pivot->name;
        }
        return $value;
    }

    /**
     * Accessor for translated url
     */
    public function getUrlAttribute($value)
    {
        if ($this->relationLoaded('current_languages') && $this->current_languages->isNotEmpty()) {
            $translatedUrl = $this->current_languages->first()->pivot->url;
            return $translatedUrl ?: $value;
        }
        return $value;
    }
}
