<?php

namespace App\Http\Controllers\Backend\V1\Banner;

use App\Http\Controllers\Backend\BaseController;
use App\Http\Requests\Banner\Banner\StoreRequest;
use App\Http\Requests\Banner\Banner\UpdateRequest;
use App\Services\Interfaces\Banner\BannerServiceInterface;
use App\Services\Interfaces\Banner\SlideServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Lang;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class BannerController extends BaseController
{
    use AuthorizesRequests;

    /** @var SlideServiceInterface */
    protected $slideService;

    public function __construct(
        BannerServiceInterface $service,
        SlideServiceInterface $slideService
    ) {
        parent::__construct($service);
        $this->slideService = $slideService;
    }

    /**
     * Hiển thị danh sách banner
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'banner:index');

        $banners = $this->service->paginate($request);
        
        return Inertia::render('backend/banner/index', [
            'banners' => $banners
        ]);
    }

    /**
     * Hiển thị form tạo mới banner
     *
     * @return Response
     */
    public function create(): Response
    {
        $this->authorize('modules', 'banner:store');

        return Inertia::render('backend/banner/save', [
            'banner' => null,
        ]);
    }

    /**
     * Lưu banner mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse
    {
        $this->authorize('modules', 'banner:store');

        $response = $this->service->saveWithSlides($request);
        
        return $this->handleAction($request, $response, redirectRoute: 'banner.index');
    }

    /**
     * Hiển thị form chỉnh sửa banner
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response
    {
        $this->authorize('modules', 'banner:update');

        $banner = $this->service->show($id);
        
        return Inertia::render('backend/banner/save', [
            'banner' => $banner,
        ]);
    }

    /**
     * Cập nhật banner
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse
    {
        $this->authorize('modules', 'banner:update');

        $response = $this->service->saveWithSlides($request, $id);
        
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'slides']);
        
        if ($onlyPublish) {
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'banner.index', editRoute: 'banner.edit');
    }

    /**
     * Xóa banner
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id): RedirectResponse
    {
        $this->authorize('modules', 'banner:delete');

        $response = $this->service->destroy($id);
        
        return redirect()->route('banner.index')
            ->with('success', Lang::get('messages.delete_success'));
    }

    /**
     * Cập nhật nhiều banner cùng lúc
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function bulkUpdate(Request $request): RedirectResponse
    {
        $this->authorize('modules', 'banner:bulkUpdate');

        $response = $this->service->bulkUpdate($request);
        
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Lấy banner theo code cho frontend
     *
     * @param Request $request
     * @param string $code
     * @return JsonResponse
     */
    public function getByCode(Request $request, string $code): JsonResponse
    {
        $banner = \App\Models\Banner::getByCode($code);
        
        if (!$banner) {
            return response()->json(['error' => 'Banner not found'], 404);
        }

        return response()->json([
            'banner' => $banner,
            'slides' => $banner->publishedSlides,
        ]);
    }
}
