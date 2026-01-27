<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;
use App\Models\ProductLanguage;
use App\Models\Router;
use App\Models\ProductBatch;

class Product extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'product_catalogue_id',
        'product_brand_id',
        'sku',
        'barcode',
        'unit',
        'retail_price',
        'wholesale_price',
        'management_type',
        'track_inventory',
        'allow_negative_stock',
        'low_stock_alert',
        'apply_tax',
        'tax_included',
        'tax_mode',
        'sale_tax_rate',
        'purchase_tax_rate',
        'image',
        'icon',
        'album',
        'script',
        'iframe',
        'qrcode',
        'gallery_style',
        'image_aspect_ratio',
        'image_object_fit',
        'order',
        'publish',
        'user_id',
        'robots',
        'auto_translate',
        'expired_warning_days',
        'deleted_at'
    ];

    // Belong To many
    protected $relationable = [
        'languages',
        'product_catalogues'
    ];

    public function creators(): BelongsTo{
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function product_catalogue(): BelongsTo{
        return $this->belongsTo(ProductCatalogue::class, 'product_catalogue_id', 'id');
    }

    public function product_brand(): BelongsTo{
        return $this->belongsTo(ProductBrand::class, 'product_brand_id', 'id');
    }

    public function languages(): BelongsToMany{
        return $this->belongsToMany(Language::class, 'product_language')->using(ProductLanguage::class)->withPivot([
            'name',
            'description',
            'content',
            'canonical',
            'meta_title',
            'meta_keyword',
            'meta_description',
        ]);
    }

    public function current_languages(): BelongsToMany {
        return $this->belongsToMany(Language::class, 'product_language')
            ->where(['language_id' => config('app.language_id')])
            ->withPivot([
                'name',
                'description',
                'content',
                'canonical',
                'meta_title',
                'meta_keyword',
                'meta_description',
            ]); 
    }

    public function product_catalogues(): BelongsToMany{
        return $this->belongsToMany(ProductCatalogue::class, 'product_catalogue_product', 'product_id', 'product_catalogue_id');
    }

    public function variants(): HasMany{
        return $this->hasMany(ProductVariant::class, 'product_id', 'id');
    }

    public function batches(): HasMany{
        return $this->hasMany(ProductBatch::class, 'product_id', 'id');
    }

    public function warehouseStocks(): HasMany{
        return $this->hasMany(ProductWarehouseStock::class, 'product_id', 'id');
    }

    public function warehouseStockLogs(): HasMany{
        return $this->hasMany(ProductWarehouseStockLog::class, 'product_id', 'id');
    }

    public function pricingTiers(): HasMany{
        return $this->hasMany(PricingTier::class, 'product_id', 'id');
    }

    public function tags(): \Illuminate\Database\Eloquent\Relations\MorphToMany{
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function routers(): MorphOne{
        return $this->morphOne(Router::class, 'routerable');
    }

    public function getRelationable(){
        return $this->relationable;
    }

    public function reviews(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
        'album' => 'json',
        'auto_translate' => 'boolean',
        'retail_price' => 'decimal:2',
        'wholesale_price' => 'decimal:2',
        'track_inventory' => 'boolean',
        'allow_negative_stock' => 'boolean',
        'low_stock_alert' => 'integer',
        'apply_tax' => 'boolean',
        'tax_included' => 'boolean',
        'sale_tax_rate' => 'decimal:2',
        'purchase_tax_rate' => 'decimal:2',
        'expired_warning_days' => 'integer',
    ];

}

