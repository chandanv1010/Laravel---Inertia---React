<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Review extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reviewable_id',
        'reviewable_type',
        'user_id',
        'fullname',
        'email',
        'phone',
        'score',
        'content',
        'publish',
    ];

    public function reviewable()
    {
        return $this->morphTo();
    }
}
