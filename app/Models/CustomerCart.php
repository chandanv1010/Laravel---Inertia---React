<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerCart extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'cart_data',
    ];

    protected $casts = [
        'cart_data' => 'json',
    ];
}
