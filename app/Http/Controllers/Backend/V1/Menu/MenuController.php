<?php

namespace App\Http\Controllers\Backend\V1\Menu;

use App\Http\Controllers\Backend\BaseController;
use App\Http\Requests\Menu\Menu\StoreRequest;
use App\Http\Requests\Menu\Menu\UpdateRequest;
use App\Services\Interfaces\Menu\MenuServiceInterface;
use App\Models\Router;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Lang;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MenuController extends BaseController
{
    use AuthorizesRequests;

    public function __construct(MenuServiceInterface $service)
    {
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách menu
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'menu:index');

        $menus = $this->service->paginate($request);
        
        return Inertia::render('backend/menu/index', [
            'menus' => $menus
        ]);
    }

    /**
     * Hiển thị form tạo mới menu
     *
     * @return Response
     */
    public function create(): Response
    {
        $this->authorize('modules', 'menu:store');

        $linkableModules = $this->getLinkableModules();
        
        return Inertia::render('backend/menu/save', [
            'menu' => null,
            'linkableModules' => $linkableModules,
            'languages' => \App\Models\Language::all(),
        ]);
    }

    /**
     * Lưu menu mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse
    {
        $this->authorize('modules', 'menu:store');

        $response = $this->service->saveWithItems($request);
        
        return $this->handleAction($request, $response, redirectRoute: 'menu.index');
    }

    /**
     * Hiển thị form chỉnh sửa menu
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response
    {
        $this->authorize('modules', 'menu:update');

        $menu = $this->service->show($id);
        $linkableModules = $this->getLinkableModules();
        $items = $this->transformItemsForFrontend($menu->items);
        
        return Inertia::render('backend/menu/save', [
            'menu' => $menu,
            'menuItems' => $items,
            'linkableModules' => $linkableModules,
            'languages' => \App\Models\Language::all(),
        ]);
    }

    /**
     * Cập nhật menu
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse
    {
        $this->authorize('modules', 'menu:update');

        $response = $this->service->saveWithItems($request, $id);
        
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'items']);
        
        if ($onlyPublish) {
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'menu.index', editRoute: 'menu.edit');
    }

    /**
     * Xóa menu
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id): RedirectResponse
    {
        $this->authorize('modules', 'menu:delete');

        $response = $this->service->destroy($id);
        
        return redirect()->route('menu.index')
            ->with('success', Lang::get('messages.delete_success'));
    }

    /**
     * Cập nhật nhiều menu cùng lúc
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function bulkUpdate(Request $request): RedirectResponse
    {
        $this->authorize('modules', 'menu:bulkUpdate');

        $response = $this->service->bulkUpdate($request);
        
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Sắp xếp lại menu items bằng drag & drop
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function reorder(Request $request): JsonResponse
    {
        $this->authorize('modules', 'menu:update');

        $response = $this->service->reorderItems($request);
        
        return response()->json([
            'success' => $response,
            'message' => $response ? 'Reorder successful' : 'Reorder failed'
        ]);
    }

    /**
     * Lấy các module có thể liên kết từ bảng routers, nhóm theo loại module
     * Giới hạn 30 item gần nhất mỗi module để tối ưu hiệu suất
     *
     * @return array
     */
    protected function getLinkableModules(): array
    {
        $moduleLabels = [
            'post_catalogues' => 'Nhóm Bài Viết',
            'posts' => 'Bài Viết',
            'product_catalogues' => 'Nhóm Sản Phẩm',
            'products' => 'Sản Phẩm',
            'product_brands' => 'Thương Hiệu',
        ];

        $result = [];
        
        foreach ($moduleLabels as $module => $label) {
            $routers = Router::with('routerable')
                ->where('module', $module)
                ->orderBy('id', 'desc')
                ->limit(30)
                ->get();
            
            if ($routers->isEmpty()) continue;
            
            $items = $routers->map(function ($router) {
                $name = $this->getRouterName($router);
                
                return [
                    'id' => $router->id,
                    'name' => $name,
                    'canonical' => '/' . $router->canonical,
                    'module' => $router->module,
                    'routerable_type' => $router->routerable_type,
                    'routerable_id' => $router->routerable_id,
                ];
            })->values()->toArray();
            
            if (count($items) > 0) {
                $result[] = [
                    'module' => $module,
                    'label' => $label,
                    'items' => $items,
                ];
            }
        }
        
        return $result;
    }

    /**
     * API endpoint để tìm kiếm các item có thể liên kết
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function searchLinkableItems(Request $request): JsonResponse
    {
        $search = $request->input('search', '');
        $module = $request->input('module', '');
        $limit = min($request->input('limit', 30), 50);
        
        $moduleLabels = [
            'post_catalogues' => 'Nhóm Bài Viết',
            'posts' => 'Bài Viết',
            'product_catalogues' => 'Nhóm Sản Phẩm',
            'products' => 'Sản Phẩm',
            'product_brands' => 'Thương Hiệu',
        ];
        
        $query = Router::with('routerable')
            ->whereIn('module', array_keys($moduleLabels));
        
        if (!empty($module) && isset($moduleLabels[$module])) {
            $query->where('module', $module);
        }
        
        if (!empty($search)) {
            $query->where('canonical', 'like', '%' . $search . '%');
        }
        
        $routers = $query->orderBy('id', 'desc')->limit($limit)->get();
        
        $items = $routers->map(function ($router) {
            $name = $this->getRouterName($router);
            
            return [
                'id' => $router->id,
                'name' => $name,
                'canonical' => '/' . $router->canonical,
                'module' => $router->module,
                'routerable_type' => $router->routerable_type,
                'routerable_id' => $router->routerable_id,
            ];
        })->values();
        
        return response()->json([
            'items' => $items,
            'total' => $items->count(),
        ]);
    }

    /**
     * Lấy tên từ model liên quan của router
     *
     * @param Router $router
     * @return string
     */
    protected function getRouterName($router): string
    {
        if (!$router->routerable) {
            return $router->canonical;
        }
        
        if (method_exists($router->routerable, 'current_languages')) {
            $lang = $router->routerable->current_languages->first();
            return $lang->pivot->name ?? $router->canonical;
        } elseif (method_exists($router->routerable, 'languages')) {
            $lang = $router->routerable->languages->first();
            return $lang->pivot->name ?? $router->canonical;
        } else {
            return $router->routerable->name ?? $router->canonical;
        }
    }

    /**
     * Chuyển đổi items thành mảng lồng nhau cho frontend, bao gồm translations
     *
     * @param \Illuminate\Database\Eloquent\Collection $items
     * @return array
     */
    protected function transformItemsForFrontend($items): array
    {
        return $items->map(function ($item) {
            // Build translations object from languages relation
            $translations = [];
            if ($item->relationLoaded('languages')) {
                foreach ($item->languages as $lang) {
                    // Skip Vietnamese (id=1) as it's the base language stored in name/url
                    if ($lang->id != 1) {
                        $translations[$lang->id] = [
                            'name' => $lang->pivot->name ?? '',
                            'url' => $lang->pivot->url ?? '',
                        ];
                    }
                }
            }

            return [
                'id' => $item->id,
                'name' => $item->getOriginal('name'), // Use original, not translated via accessor
                'url' => $item->getOriginal('url'),
                'target' => $item->target,
                'icon' => $item->icon,
                'linkable_type' => $item->linkable_type,
                'linkable_id' => $item->linkable_id,
                'publish' => $item->publish,
                'order' => $item->order,
                'translations' => $translations, // Include all translations
                'children' => $item->children ? $this->transformItemsForFrontend($item->children) : [],
            ];
        })->toArray();
    }
}
