<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasCanonical;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\Pivot;

class MenuItemLanguage extends Pivot
{
    protected $table = 'menu_item_languages';
    public $timestamps = true;
    
    protected $fillable = [
        'menu_item_id',
        'language_id',
        'name',
        'canonical',
        'url',
    ];

    // Optional: Only if we need canonical logic like autoslug, but usually names are just names.
    // HasCanonical trait usually handles generating slug from name.
    // But for menu, explicit URL or Canonical might be manual.
}
