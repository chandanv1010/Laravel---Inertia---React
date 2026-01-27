<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use App\Traits\HasCanonical;
use App\Models\ProductCatalogueLanguage;

class ProductCatalogue extends Model
{
    use HasFactory, SoftDeletes, HasQuery, HasCanonical;

    // Static cache for request lifecycle - reduces duplicate queries
    private static $withLanguagesCache = [];

    protected $fillable = [
        'parent_id',
        'image',
        'icon',
        'album',
        'type',
        'script',
        'iframe',
        'publish',
        'user_id',
        'order',
        'deleted_at',
        'robots',
        'auto_translate'
    ];

    protected $relationable = ['languages'];

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
        'album' => 'json',
        'auto_translate' => 'boolean'
    ];

    /**
     * Get cached catalogues by IDs (with languages loaded)
     * Reduces duplicate queries within same request
     */
    public static function getCachedWithLanguages(array $ids, bool $withProductsCount = false): \Illuminate\Support\Collection
    {
        $uncachedIds = array_diff($ids, array_keys(self::$withLanguagesCache));
        
        if (!empty($uncachedIds)) {
            $query = self::whereIn('id', $uncachedIds)->with('languages');
            
            if ($withProductsCount) {
                $query->withCount(['products' => fn($q) => $q->where('publish', 2)]);
            }
            
            $newItems = $query->get();
            
            foreach ($newItems as $item) {
                self::$withLanguagesCache[$item->id] = $item;
            }
        }
        
        return collect($ids)->map(fn($id) => self::$withLanguagesCache[$id] ?? null)->filter()->values();
    }

    /**
     * Get cached catalogues by parent_id (children)
     */
    public static function getCachedChildrenByParentIds(array $parentIds): \Illuminate\Support\Collection
    {
        // Get all children of these parents
        $children = self::whereIn('parent_id', $parentIds)->with('languages')->get();
        
        // Add to cache
        foreach ($children as $child) {
            if (!isset(self::$withLanguagesCache[$child->id])) {
                self::$withLanguagesCache[$child->id] = $child;
            }
        }
        
        return $children;
    }

    /**
     * Clear cache (for testing)
     */
    public static function clearCache(): void
    {
        self::$withLanguagesCache = [];
    }

    public function creators(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function getRelationable()
    {
        return $this->relationable;
    }

    public function languages(): BelongsToMany
    {
        return $this->belongsToMany(Language::class, 'product_catalogue_language')
            ->using(ProductCatalogueLanguage::class)
            ->withPivot([
                'name', 'description', 'content', 'canonical',
                'meta_title', 'meta_keyword', 'meta_description',
            ]);
    }

    public function current_languages(): BelongsToMany 
    {
        return $this->belongsToMany(Language::class, 'product_catalogue_language')
            ->where(['language_id' => config('app.language_id')])
            ->withPivot([
                'name', 'description', 'content', 'canonical',
                'meta_title', 'meta_keyword', 'meta_description',
            ]); 
    }

    public function routers(): MorphOne
    {
        return $this->morphOne(Router::class, 'routerable');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_catalogue_product', 'product_catalogue_id', 'product_id');
    }
}
