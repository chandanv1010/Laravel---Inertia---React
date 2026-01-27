<?php

namespace App\Services\Impl\V1\Menu;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Menu\MenuServiceInterface;
use App\Repositories\Menu\MenuRepo;
use App\Repositories\Menu\MenuItemRepo;
use App\Models\MenuItem;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MenuService extends BaseCacheService implements MenuServiceInterface {

    protected string $cacheStrategy = 'lazy';
    protected string $module = 'menus';

    protected $repository;
    protected $menuItemRepo;

    protected $with = ['creator', 'items.children'];
    protected $simpleFilter = ['publish', 'position'];
    protected $searchFields = ['name', 'code'];
    protected $sort = ['order', 'asc'];

    public function __construct(
        MenuRepo $repository,
        MenuItemRepo $menuItemRepo
    )
    {
        $this->repository = $repository;
        $this->menuItemRepo = $menuItemRepo;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        
        // Auto-generate code if not provided
        if (empty($this->modelData['code'])) {
            $this->modelData['code'] = Str::slug($this->modelData['name'] ?? 'menu') . '-' . time();
        }
        
        // Remove 'items' from request to prevent BaseCacheService from trying to sync it
        unset($this->modelData['items']);
        
        return $this;
    }

    /**
     * Save menu with items (Sync approach to preserve translation)
     */
    public function saveWithItems($request, $id = null) {
        return DB::transaction(function () use ($request, $id) {
            // Save menu first
            $this->request = $request;
            $menu = $this->skipWithRelation(true)->save($request, $id);
            
            if (!$menu) {
                return null;
            }

            // Get the menu model
            $menuModel = $this->model ?? $this->repository->getModel()->find($id); // Refind if needed or use returned model if strictly Model
            // Usually save() returns Model or true? BaseService save returns Model.
            if (!$menuModel && $menu instanceof \Illuminate\Database\Eloquent\Model) {
                $menuModel = $menu;
            } else if (!$menuModel && $id) {
                 $menuModel = $this->repository->getModel()->find($id);
            } else if (!$menuModel && isset($menu->id)) { // If menu created
                 $menuModel = $menu;
            }

             // Collect all IDs from payload to identify what to delete
            $items = $request->input('items', []);
            $flattenIds = $this->flattenIds($items);
            
            // Delete items that are no longer in the list (pruning)
            // But only if we are Updating (id exists)
            // NOTE: If creating new menu, invalid/existing Items shouldn't belong to it yet.
            if ($id) {
                 $existingIds = MenuItem::where('menu_id', $menuModel->id)->pluck('id')->toArray();
                 $idsToDelete = array_diff($existingIds, $flattenIds);
                 if (!empty($idsToDelete)) {
                     MenuItem::whereIn('id', $idsToDelete)->delete(); // Soft delete or force? Model has SoftDeletes.
                 }
            }
            
            // Save items (Update/Create)
            $this->saveItems($menuModel->id, $items);
            
            return $menuModel;
        });
    }

    /**
     * Flatten items to get IDs
     */
    protected function flattenIds($items) {
        $ids = [];
        foreach ($items as $item) {
            if (isset($item['id'])) {
                $ids[] = $item['id'];
            }
            if (!empty($item['children'])) {
                $ids = array_merge($ids, $this->flattenIds($item['children']));
            }
        }
        return $ids;
    }

    /**
     * Recursively save menu items (Sync & Translate)
     */
    protected function saveItems($menuId, $items, $parentId = null) {
        $defaultLanguageId = 1; // Vietnamese - always save the base name/url here

        foreach ($items as $index => $itemData) {
            $itemId = $itemData['id'] ?? null;
            
            $payload = [
                'menu_id' => $menuId,
                'parent_id' => $parentId,
                'name' => $itemData['name'] ?? '',
                'url' => $itemData['url'] ?? null,
                'target' => $itemData['target'] ?? '_self',
                'icon' => $itemData['icon'] ?? null,
                'linkable_type' => $itemData['linkable_type'] ?? null,
                'linkable_id' => $itemData['linkable_id'] ?? null,
                'publish' => $itemData['publish'] ?? '2',
                'order' => $index,
            ];

            // Update or Create
            $item = MenuItem::updateOrCreate(
                ['id' => $itemId], // If $itemId is null, it creates. If exists, updates.
                $payload
            );
            
            // Prepare translations to sync
            $translationsToSync = [];
            
            // Always save the base (Vietnamese) translation from name/url
            $translationsToSync[$defaultLanguageId] = [
                'name' => $itemData['name'] ?? '',
                'url' => $itemData['url'] ?? null,
            ];
            
            // Save all other translations from the frontend 'translations' field
            if (!empty($itemData['translations']) && is_array($itemData['translations'])) {
                foreach ($itemData['translations'] as $langId => $translation) {
                    $translationsToSync[$langId] = [
                        'name' => $translation['name'] ?? '',
                        'url' => $translation['url'] ?? null,
                    ];
                }
            }
            
            // Sync all translations
            if ($item && !empty($translationsToSync)) {
                $item->languages()->syncWithoutDetaching($translationsToSync);
            }
            
            // Recursively save children
            if (!empty($itemData['children'])) {
                $this->saveItems($menuId, $itemData['children'], $item->id);
            }
        }
    }

    /**
     * Reorder menu items
     */
    public function reorderItems($request) {
        $items = $request->input('items', []);
        
        return DB::transaction(function () use ($items) {
            $this->updateItemsOrder($items);
            return true;
        });
    }

    /**
     * Recursively update items order
     */
    protected function updateItemsOrder($items, $parentId = null) {
        foreach ($items as $index => $itemData) {
            MenuItem::where('id', $itemData['id'])->update([
                'parent_id' => $parentId,
                'order' => $index,
            ]);
            
            if (!empty($itemData['children'])) {
                $this->updateItemsOrder($itemData['children'], $itemData['id']);
            }
        }
    }

    /**
     * Get nested items for a menu
     */
    public function getNestedItems($menuId) {
        return $this->menuItemRepo->getNestedByMenuId($menuId);
    }

    /**
     * Override show to load nested items with all translations
     */
    public function show(int $id) {
        $this->model = $this->repository->getModel()
            ->with([
                'creator', 
                'items.languages', // Load ALL translations for editing
                'items.children.languages', 
                'items.children.children.languages'
            ])
            ->findOrFail($id);
        
        $this->result = $this->model;
        return $this->getResult();
    }
}
