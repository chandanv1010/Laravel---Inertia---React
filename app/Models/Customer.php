<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Carbon;

class Customer extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'user_id',
        'customer_catalogue_id',
        'last_name',
        'first_name',
        'email',
        'phone',
        'date_of_birth',
        'gender',
        'receive_promotional_emails',
        'shipping_last_name',
        'shipping_first_name',
        'shipping_company',
        'shipping_phone',
        'shipping_country',
        'shipping_postal_code',
        'shipping_province',
        'shipping_district',
        'shipping_ward',
        'shipping_address',
        'use_new_address_format',
        'notes',
        'publish',
        'deleted_at',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'receive_promotional_emails' => 'boolean',
        'use_new_address_format' => 'boolean',
        'created_at' => 'datetime:d-m-Y H:i',
        'updated_at' => 'datetime:d-m-Y H:i',
    ];

    protected $relationable = [];

    public function getRelationable(){
        return $this->relationable;
    }

    public function creators(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function customer_catalogue(): BelongsTo
    {
        return $this->belongsTo(CustomerCatalogue::class, 'customer_catalogue_id', 'id');
    }

    protected function dateOfBirth(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? Carbon::parse($value)->format('Y-m-d') : null,
            set: fn ($value) => $value ? Carbon::createFromFormat('Y-m-d', $value)->format('Y-m-d') : null
        );
    }

    public function getNameAttribute(): string
    {
        return trim($this->last_name . ' ' . $this->first_name);
    }
}
