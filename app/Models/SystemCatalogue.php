<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SystemCatalogue extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'keyword',
        'sort_order',
        'publish',
        'user_id',
    ];

    public function systems()
    {
        return $this->hasMany(System::class, 'system_catalogue_id')->orderBy('sort_order', 'asc');
    }
}
