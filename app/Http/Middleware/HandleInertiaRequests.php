<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Interfaces\Setting\SystemServiceInterface;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use App\Services\Interfaces\Banner\BannerServiceInterface;
use App\Models\Menu;
use App\Models\MenuItem;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    protected $systemService;
    protected $productCatalogueService;
    protected $bannerService;

    public function __construct(
        SystemServiceInterface $systemService,
        ProductCatalogueServiceInterface $productCatalogueService,
        BannerServiceInterface $bannerService
    ) {
        $this->systemService = $systemService;
        $this->productCatalogueService = $productCatalogueService;
        $this->bannerService = $bannerService;
    }

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function handle(Request $request, \Closure $next): Response
    {
        $response = parent::handle($request, $next);
        $response->headers->set('Permissions-Policy', 'unload=*');
        return $response;
    }

    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        $isFrontend = !$request->is('backend*') && !$request->is('dashboard*');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => ['user' => $request->user()],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
            ],
            'app' => [
                'url' => config('app.url'),
                'language_id' => config('app.language_id')
            ],
            'request' => $request->all(),
            'tooltips' => config('tooltips'),
            'settings' => $isFrontend ? $this->systemService->getAllConfig() : null,
            'categories' => $isFrontend ? $this->productCatalogueService->getDropdownWithHierarchy() : null,
            'menus' => $isFrontend ? $this->getMenusForFrontend() : null,
        ];
    }

    /**
     * Lấy menus cho frontend - tối ưu batch load
     */
    protected function getMenusForFrontend(): array
    {
        $languageId = config('app.language_id', 1);

        // Load tất cả menus và items trong 2 queries
        $menus = Menu::whereIn('code', ['main-menu', 'footer-menu'])
            ->where('publish', '2')
            ->get()
            ->keyBy('code');

        if ($menus->isEmpty()) {
            return ['main' => [], 'footer' => []];
        }

        $menuIds = $menus->pluck('id')->toArray();

        // Load tất cả items một lần với languages
        $allItems = MenuItem::whereIn('menu_id', $menuIds)
            ->where('publish', '2')
            ->with('languages')
            ->orderBy('order')
            ->get();

        // Group items theo menu_id
        $itemsByMenu = $allItems->groupBy('menu_id');

        // Build trees
        $mainMenu = $menus->get('main-menu');
        $footerMenu = $menus->get('footer-menu');

        return [
            'main' => $mainMenu ? $this->buildMenuTree($itemsByMenu->get($mainMenu->id, collect()), $languageId) : [],
            'footer' => $footerMenu ? $this->buildMenuTreeAsGroups($itemsByMenu->get($footerMenu->id, collect()), $languageId) : [],
        ];
    }

    /**
     * Build menu tree từ flat items
     */
    protected function buildMenuTree($items, $languageId, $parentId = null): array
    {
        return $items
            ->filter(fn($item) => $item->parent_id === $parentId)
            ->map(function ($item) use ($items, $languageId) {
                $lang = $item->languages->firstWhere('id', $languageId);
                $name = $lang?->pivot?->name ?: $item->getOriginal('name');
                $url = $lang?->pivot?->url ?: $item->getOriginal('url');

                return [
                    'id' => $item->id,
                    'name' => $name,
                    'url' => $url,
                    'target' => $item->target,
                    'icon' => $item->icon,
                    'children' => $this->buildMenuTree($items, $languageId, $item->id),
                ];
            })
            ->values()
            ->toArray();
    }

    /**
     * Build menu tree as groups (cho footer)
     */
    protected function buildMenuTreeAsGroups($items, $languageId): array
    {
        return $items
            ->filter(fn($item) => $item->parent_id === null)
            ->map(function ($item) use ($items, $languageId) {
                $lang = $item->languages->firstWhere('id', $languageId);
                $name = $lang?->pivot?->name ?: $item->getOriginal('name');

                return [
                    'id' => $item->id,
                    'name' => $name,
                    'children' => $this->buildMenuTree($items, $languageId, $item->id),
                ];
            })
            ->values()
            ->toArray();
    }
}
