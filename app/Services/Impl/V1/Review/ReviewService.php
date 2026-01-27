<?php
namespace App\Services\Impl\V1\Review;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Review\ReviewServiceInterface;
use App\Repositories\Review\ReviewRepo;
use Illuminate\Http\Request;

/**
 * Service class for managing Reviews
 * 
 * Handles business logic for review operations including
 * CRUD, pagination, status updates, and bulk actions.
 * Extends BaseCacheService for automatic caching support.
 */
class ReviewService extends BaseCacheService implements ReviewServiceInterface
{
    /**
     * @var ReviewRepo
     */
    protected $repository;

    /**
     * Cache strategy: 'default' for simple list with minimal filters
     *
     * @var string
     */
    protected string $cacheStrategy = 'default';

    /**
     * Module identifier for cache keys
     *
     * @var string
     */
    protected string $module = 'reviews';

    /**
     * Relations to eager load
     *
     * @var array
     */
    protected $with = ['reviewable'];

    /**
     * Simple equality filters from request
     *
     * @var array
     */
    protected $simpleFilter = ['publish', 'reviewable_type'];

    /**
     * Fields to search with keyword
     *
     * @var array
     */
    protected $searchFields = ['fullname', 'content', 'email', 'phone'];

    /**
     * Default sorting
     *
     * @var array
     */
    protected $sort = ['id', 'desc'];

    /**
     * ReviewService constructor
     *
     * @param ReviewRepo $repository
     */
    public function __construct(ReviewRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    /**
     * Paginate reviews with filters and search
     *
     * @param Request $request
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function paginate($request)
    {
        $this->setRequest($request);
        
        // Handle module filter -> convert to reviewable_type
        if ($request->has('module') && $request->input('module')) {
            $modelClass = match($request->input('module')) {
                'product' => \App\Models\Product::class,
                'post' => \App\Models\Post::class,
                default => null,
            };
            if ($modelClass) {
                $request->merge(['reviewable_type' => $modelClass]);
            }
        }
        
        return parent::paginate($request);
    }

    /**
     * Create a new review
     *
     * @param array $payload Review data
     * @return \App\Models\Review
     * @throws \Exception
     */
    public function create($payload)
    {
        $request = new Request($payload);
        $this->setRequest($request);
        return $this->save();
    }

    /**
     * Update an existing review
     *
     * @param int $id Review ID
     * @param array $payload Updated data
     * @return \App\Models\Review
     * @throws \Exception
     */
    public function update($id, $payload)
    {
        $request = new Request($payload);
        $this->setRequest($request);
        $this->model = $this->repository->findById($id);
        return $this->save();
    }

    /**
     * Delete a review by ID
     *
     * @param int $id Review ID
     * @return bool
     * @throws \Exception
     */
    public function delete($id)
    {
        $this->model = $this->repository->findById($id);
        return $this->destroy();
    }

    /**
     * Find a review by ID with relations
     *
     * @param int $id Review ID
     * @return \App\Models\Review
     */
    public function findById($id)
    {
        return $this->repository->findById($id, $this->with);
    }

    /**
     * Update a specific field/status of a review
     *
     * @param int $id Review ID
     * @param string $field Field name to update
     * @param mixed $value New value
     * @return bool
     */
    public function updateStatus($id, $field, $value)
    {
        $request = new Request([$field => $value]);
        $this->setRequest($request);
        $this->model = $this->repository->findById($id);
        $this->skipBeforeSave = true;
        
        try {
            $this->save();
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Bulk update multiple reviews
     *
     * @param array $payload Contains 'ids' and field to update
     * @return bool
     */
    public function bulkUpdate($payload)
    {
        if (!isset($payload['ids'])) {
            return false;
        }
        
        $request = new Request($payload);
        $this->setRequest($request);
        
        return parent::bulkUpdate();
    }

    /**
     * Bulk delete multiple reviews
     *
     * @param array $ids Array of Review IDs
     * @return bool
     */
    public function bulkDestroy($ids)
    {
        $request = new Request(['ids' => $ids]);
        $this->setRequest($request);
        
        return parent::bulkDestroy();
    }

    /**
     * Prepare model data from request
     *
     * @return static
     */
    protected function prepareModelData(): static
    {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        
        // Handle reviewable_type conversion from simple string
        if ($this->request->has('reviewable_type')) {
            $type = $this->request->input('reviewable_type');
            if (!str_contains($type, '\\')) {
                $this->modelData['reviewable_type'] = match($type) {
                    'product' => \App\Models\Product::class,
                    'post' => \App\Models\Post::class,
                    default => $type,
                };
            }
        }
        
        return $this;
    }
}
