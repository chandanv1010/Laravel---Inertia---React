<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class ProductVariant extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'product_id',
        'sku',
        'barcode',
        'imei',
        'serial_number',
        'batch_number',
        'expiry_date',
        'management_type',
        'track_inventory',
        'allow_negative_stock',
        'low_stock_alert',
        'expired_warning_days',
        'wholesale_price',
        'retail_price',
        'cost_price',
        'compare_price',
        'stock_quantity',
        'is_default',
        'image',
        'album',
        'order',
        'publish',
        'deleted_at'
    ];

    protected $relationable = [];

    public function product(): BelongsTo{
        return $this->belongsTo(Product::class, 'product_id', 'id');
    }

    public function attributes(): BelongsToMany{
        return $this->belongsToMany(Attribute::class, 'product_variant_attributes', 'product_variant_id', 'attribute_id');
    }

    public function warehouseStocks(): HasMany{
        return $this->hasMany(ProductVariantWarehouseStock::class, 'product_variant_id', 'id');
    }

    public function warehouseStockLogs(): HasMany{
        return $this->hasMany(ProductVariantWarehouseStockLog::class, 'product_variant_id', 'id');
    }

    public function batches(): HasMany{
        return $this->hasMany(ProductBatch::class, 'product_variant_id', 'id');
    }

    public function getRelationable(){
        return $this->relationable;
    }

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
        'wholesale_price' => 'decimal:2',
        'retail_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'compare_price' => 'decimal:2',
        'is_default' => 'boolean',
        'stock_quantity' => 'integer',
        'expiry_date' => 'date',
        'track_inventory' => 'boolean',
        'allow_negative_stock' => 'boolean',
        'low_stock_alert' => 'integer',
        'expired_warning_days' => 'integer',
        'album' => 'json'
    ];

}

