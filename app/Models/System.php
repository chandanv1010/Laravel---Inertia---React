<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class System extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'system_catalogue_id',
        'label',
        'keyword',
        'type',
        'is_translatable',
        'description',
        'sort_order',
        'publish',
        'user_id',
        'attributes',
    ];

    public function catalogue()
    {
        return $this->belongsTo(SystemCatalogue::class, 'system_catalogue_id');
    }

    public function languages()
    {
        return $this->belongsToMany(Language::class, 'system_language', 'system_id', 'language_id')
            ->withPivot('content');
    }

    protected $casts = [
        'publish' => 'string', // Cast to string for frontend compatibility
        'is_translatable' => 'integer',
        'attributes' => 'array', // Cast JSON to array
    ];
}
