<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class Promotion extends Model
{
    use SoftDeletes, HasQuery;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'discount_type',
        'discount_value',
        'max_discount_value',
        'combo_price',
        'condition_type',
        'condition_value',
        'customer_group_type',
        'store_type',
        'apply_source',
        'combine_with_order_discount',
        'combine_with_product_discount',
        'combine_with_free_shipping',
        'start_date',
        'end_date',
        'no_end_date',
        'order',
        'publish',
        'deleted_at',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'max_discount_value' => 'decimal:2',
        'combo_price' => 'decimal:2',
        'condition_value' => 'decimal:2',
        'combine_with_order_discount' => 'boolean',
        'combine_with_product_discount' => 'boolean',
        'combine_with_free_shipping' => 'boolean',
        'no_end_date' => 'boolean',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'publish' => 'string',
        'order' => 'integer',
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

    protected $relationable = ['customer_groups', 'product_variants', 'product_catalogues'];

    public function getRelationable()
    {
        return $this->relationable;
    }

    /**
     * Get the user that created the promotion
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the customer groups for this promotion
     */
    public function customer_groups(): BelongsToMany
    {
        return $this->belongsToMany(
            CustomerCatalogue::class,
            'promotion_customer_group',
            'promotion_id',
            'customer_catalogue_id'
        )->withTimestamps();
    }

    /**
     * Get the product variants for this promotion
     */
    public function product_variants(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductVariant::class,
            'promotion_product_variant',
            'promotion_id',
            'product_variant_id'
        )->withTimestamps();
    }

    /**
     * Get the product catalogues for this promotion
     */
    public function product_catalogues(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductCatalogue::class,
            'promotion_product_catalogue',
            'promotion_id',
            'product_catalogue_id'
        )->withTimestamps();
    }

    /**
     * Get the combo items for this promotion (for type = combo)
     */
    public function combo_items()
    {
        return $this->hasMany(PromotionComboItem::class, 'promotion_id');
    }

    /**
     * Scope để filter theo tình trạng hết hạn/còn hạn
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $status 'active' (còn hạn) hoặc 'expired' (hết hạn)
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeExpiryStatus($query, string $status)
    {
        $now = now();
        
        if ($status === 'active') {
            // Còn hạn: end_date > now() hoặc no_end_date = true
            return $query->where(function($q) use ($now) {
                $q->where('no_end_date', true)
                  ->orWhere(function($subQ) use ($now) {
                      $subQ->whereNotNull('end_date')
                           ->where('end_date', '>', $now);
                  });
            });
        } elseif ($status === 'expired') {
            // Hết hạn: end_date < now() và no_end_date = false
            return $query->where(function($q) use ($now) {
                $q->where('no_end_date', false)
                  ->whereNotNull('end_date')
                  ->where('end_date', '<', $now);
            });
        }
        
        return $query;
    }
}
