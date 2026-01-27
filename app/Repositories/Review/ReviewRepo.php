<?php
namespace App\Repositories\Review;

use App\Repositories\BaseRepo;
use App\Models\Review;

/**
 * Repository class for Review model
 * Handles all database operations for reviews
 */
class ReviewRepo extends BaseRepo
{
    /**
     * @var Review
     */
    protected $model;

    /**
     * Relations to eager load
     *
     * @var array
     */
    protected $with = ['reviewable'];

    /**
     * ReviewRepo constructor
     *
     * @param Review $model
     */
    public function __construct(Review $model)
    {
        $this->model = $model;
        parent::__construct($model);
    }
}
