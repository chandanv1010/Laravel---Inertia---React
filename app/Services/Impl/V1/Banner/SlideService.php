<?php

namespace App\Services\Impl\V1\Banner;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Banner\SlideServiceInterface;
use App\Repositories\Banner\SlideRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SlideService extends BaseCacheService implements SlideServiceInterface {

    protected string $cacheStrategy = 'lazy';
    protected string $module = 'slides';

    protected $repository;

    protected $with = ['banner', 'creator'];
    protected $simpleFilter = ['publish', 'banner_id'];
    protected $searchFields = ['name'];
    protected $sort = ['order', 'asc'];

    public function __construct(SlideRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        
        // Handle elements JSON
        if ($this->request->has('elements')) {
            $elements = $this->request->input('elements');
            $this->modelData['elements'] = is_array($elements) ? json_encode($elements) : $elements;
        }
        
        return $this;
    }

    /**
     * Save slide with elements
     */
    public function saveWithElements($request, $id = null) {
        return DB::transaction(function () use ($request, $id) {
            $this->request = $request;
            return $this->save($request, $id);
        });
    }

    /**
     * Get slides by banner ID
     */
    public function getByBannerId(int $bannerId) {
        return $this->repository->getByBannerId($bannerId);
    }

    /**
     * Override show to load banner
     */
    public function show(int $id) {
        $this->model = $this->repository->getModel()
            ->with(['banner', 'creator'])
            ->findOrFail($id);
        
        $this->result = $this->model;
        return $this->getResult();
    }
}
