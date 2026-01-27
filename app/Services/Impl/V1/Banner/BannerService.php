<?php

namespace App\Services\Impl\V1\Banner;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Banner\BannerServiceInterface;
use App\Repositories\Banner\BannerRepo;
use App\Repositories\Banner\SlideRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BannerService extends BaseCacheService implements BannerServiceInterface {

    protected string $cacheStrategy = 'lazy';
    protected string $module = 'banners';

    protected $repository;
    protected $slideRepo;

    protected $with = ['creator', 'slides'];
    protected $simpleFilter = ['publish', 'position'];
    protected $searchFields = ['name', 'code'];
    protected $sort = ['order', 'asc'];

    public function __construct(
        BannerRepo $repository,
        SlideRepo $slideRepo
    )
    {
        $this->repository = $repository;
        $this->slideRepo = $slideRepo;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        
        // Auto-generate code if not provided
        if (empty($this->modelData['code'])) {
            $this->modelData['code'] = Str::slug($this->modelData['name'] ?? 'banner') . '-' . time();
        }
        
        // Remove 'slides' from model data to prevent issues
        unset($this->modelData['slides']);
        
        return $this;
    }

    /**
     * Save banner with slides
     */
    public function saveWithSlides($request, $id = null) {
        return DB::transaction(function () use ($request, $id) {
            $this->request = $request;
            $banner = $this->skipWithRelation(true)->save($request, $id);
            
            if (!$banner) {
                return null;
            }

            $bannerModel = $this->model ?? $this->repository->getModel()->find($id);
            
            // Handle slides if provided
            $slides = $request->input('slides', []);
            if (!empty($slides)) {
                // Delete existing slides if updating
                if ($id) {
                    $this->slideRepo->deleteByBannerId($bannerModel->id);
                }
                
                // Save new slides
                $this->saveSlides($bannerModel->id, $slides);
            }
            
            return $banner;
        });
    }

    /**
     * Save slides for a banner
     */
    protected function saveSlides($bannerId, $slides) {
        foreach ($slides as $index => $slideData) {
            \App\Models\Slide::create([
                'banner_id' => $bannerId,
                'name' => $slideData['name'] ?? null,
                'background_image' => $slideData['background_image'] ?? null,
                'background_color' => $slideData['background_color'] ?? '#ffffff',
                'background_position_x' => $slideData['background_position_x'] ?? 50,
                'background_position_y' => $slideData['background_position_y'] ?? 50,
                'elements' => json_encode($slideData['elements'] ?? []),
                'url' => $slideData['url'] ?? null,
                'target' => $slideData['target'] ?? '_self',
                'order' => $index,
                'publish' => $slideData['publish'] ?? '2',
                'start_date' => $slideData['start_date'] ?? null,
                'end_date' => $slideData['end_date'] ?? null,
                'user_id' => Auth::id(),
            ]);
        }
    }

    /**
     * Override show to load slides and format for frontend
     */
    public function show(int $id) {
        $banner = $this->repository->getModel()
            ->with(['creator', 'slides' => function($q) {
                $q->where('publish', 2)->orderBy('order', 'asc');
            }])
            ->findOrFail($id);
        
        // Format slides like getByCode() for frontend compatibility
        $slides = $banner->slides->map(function($slide) {
            // Ensure elements is always an array
            $elements = $slide->elements;
            if (is_string($elements)) {
                $elements = json_decode($elements, true) ?? [];
            }
            if (!is_array($elements)) {
                $elements = [];
            }
            
            return [
                'id' => $slide->id,
                'name' => $slide->name ?? '',
                'title' => $slide->name ?? '',
                'description' => $slide->description ?? '',
                'button_text' => $slide->button_text ?? '',
                'button_link' => $slide->url ?? '',
                'background_image' => $slide->background_image ?? '',
                'background_color' => $slide->background_color ?? '#1a6f93',
                'background_position_x' => $slide->background_position_x ?? 50,
                'background_position_y' => $slide->background_position_y ?? 50,
                'countdown_end' => $slide->end_date ?? null,
                'elements' => $elements,
                'url' => $slide->url,
                'target' => $slide->target,
            ];
        });
        
        return [
            'id' => $banner->id,
            'name' => $banner->name,
            'code' => $banner->code,
            'width' => $banner->width,
            'height' => $banner->height,
            'slides' => $slides->toArray(),
        ];
    }
    
    /**
     * Get Banner by Code (for frontend display)
     * Uses repository to maintain Controller-Service-Repository pattern
     */
    public function getByCode(string $code) {
        $banner = $this->repository->getModel()
            ->where('code', $code)
            ->where('publish', 2)
            ->with(['slides' => function($q) {
                $q->where('publish', 2)->orderBy('order', 'asc');
            }])
            ->first();
            
        if (!$banner) return null;
        
        $slides = $banner->slides->map(function($slide) {
            // Ensure elements is always an array
            $elements = $slide->elements;
            if (is_string($elements)) {
                $elements = json_decode($elements, true) ?? [];
            }
            if (!is_array($elements)) {
                $elements = [];
            }
            
            return [
                'id' => $slide->id,
                'name' => $slide->name ?? '',
                'title' => $slide->name ?? '',
                'description' => $slide->description ?? '',
                'button_text' => $slide->button_text ?? '',
                'button_link' => $slide->url ?? '',
                'background_image' => $slide->background_image ?? '',
                'background_color' => $slide->background_color ?? '#1a6f93',
                'background_position_x' => $slide->background_position_x ?? 50,
                'background_position_y' => $slide->background_position_y ?? 50,
                'countdown_end' => $slide->end_date ?? null,
                'elements' => $elements,
                'url' => $slide->url,
                'target' => $slide->target,
            ];
        });
        
        return [
            'id' => $banner->id,
            'name' => $banner->name,
            'code' => $banner->code,
            'width' => $banner->width,
            'height' => $banner->height,
            'slides' => $slides->toArray(),
        ];
    }
    
    /**
     * Lấy nhiều banners theo mảng codes (tối ưu 1 query thay vì N queries)
     * @param array $codes Mảng các code cần lấy
     * @return array Dữ liệu dạng ['code' => bannerData]
     */
    public function getMultipleByCodes(array $codes): array
    {
        if (empty($codes)) {
            return [];
        }
        
        $banners = $this->repository->getModel()
            ->whereIn('code', $codes)
            ->where('publish', 2)
            ->with(['slides' => function($q) {
                $q->where('publish', 2)->orderBy('order', 'asc');
            }])
            ->get();
            
        $result = [];
        
        foreach ($banners as $banner) {
            $slides = $banner->slides->map(function($slide) {
                $elements = $slide->elements;
                if (is_string($elements)) {
                    $elements = json_decode($elements, true) ?? [];
                }
                if (!is_array($elements)) {
                    $elements = [];
                }
                
                return [
                    'id' => $slide->id,
                    'name' => $slide->name ?? '',
                    'title' => $slide->name ?? '',
                    'description' => $slide->description ?? '',
                    'button_text' => $slide->button_text ?? '',
                    'button_link' => $slide->url ?? '',
                    'background_image' => $slide->background_image ?? '',
                    'background_color' => $slide->background_color ?? '#1a6f93',
                    'background_position_x' => $slide->background_position_x ?? 50,
                    'background_position_y' => $slide->background_position_y ?? 50,
                    'countdown_end' => $slide->end_date ?? null,
                    'elements' => $elements,
                    'url' => $slide->url,
                    'target' => $slide->target,
                ];
            });
            
            $result[$banner->code] = [
                'id' => $banner->id,
                'name' => $banner->name,
                'code' => $banner->code,
                'width' => $banner->width,
                'height' => $banner->height,
                'slides' => $slides->toArray(),
            ];
        }
        
        return $result;
    }
}

