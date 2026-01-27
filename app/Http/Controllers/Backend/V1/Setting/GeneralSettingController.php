<?php

namespace App\Http\Controllers\Backend\V1\Setting;

use App\Http\Controllers\Backend\BaseController;
use App\Services\Interfaces\Setting\SystemServiceInterface;
use App\Services\Interfaces\Setting\LanguageServiceInterface;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Lang;
use Inertia\Inertia;
use Inertia\Response;

class GeneralSettingController extends BaseController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly SystemServiceInterface $systemService,
        private readonly LanguageServiceInterface $languageService
    ) {
        parent::__construct($systemService);
    }

    /**
     * Hiển thị trang cấu hình chung
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'setting:index');

        $systemCatalogues = $this->systemService->getSystemHierarchy();
        
        $languagesPaginate = $this->languageService->paginate(new Request(['type' => 'all', 'publish' => '2']));
        $languages = $languagesPaginate->map(function ($language) {
            return [
                'id' => $language->id,
                'name' => $language->name,
                'canonical' => $language->canonical,
                'image' => $language->image,
            ];
        })->values()->toArray();
        
        return Inertia::render('backend/setting/general/index', [
            'systemCatalogues' => $systemCatalogues,
            'languages' => $languages,
        ]);
    }

    /**
     * Cập nhật cấu hình chung
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse|\Illuminate\Http\JsonResponse
     */
    public function update(Request $request)
    {
        $this->authorize('modules', 'setting:update');

        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        try {
            $this->systemService->updateValues($validated['settings']);

            if ($request->header('X-Inertia') || $request->wantsJson() === false) {
                return redirect()->back()->with('success', Lang::get('messages.save_success'));
            }

            return response()->json([
                'success' => true,
                'message' => Lang::get('messages.save_success'),
            ]);
        } catch (\Exception $e) {
            if ($request->header('X-Inertia') || $request->wantsJson() === false) {
                return redirect()->back()->withErrors(['error' => $e->getMessage()]);
            }

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

