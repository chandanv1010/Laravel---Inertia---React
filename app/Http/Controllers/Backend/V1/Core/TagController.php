<?php

namespace App\Http\Controllers\Backend\V1\Core;

use App\Http\Controllers\Backend\BaseController;
use App\Http\Requests\Core\Tag\StoreRequest;
use App\Http\Requests\Core\Tag\UpdateRequest;
use App\Services\Interfaces\Core\TagServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Lang;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class TagController extends BaseController
{
    use AuthorizesRequests;

    /** @var TagServiceInterface */
    protected $service;

    public function __construct(TagServiceInterface $service)
    {
        $this->service = $service;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách tag
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'tag:index');

        $tags = $this->service->paginate($request);
        
        return Inertia::render('Backend/core/tag/index', [
            'tags' => $tags
        ]);
    }

    /**
     * Hiển thị form tạo mới tag
     *
     * @return Response
     */
    public function create(): Response
    {
        $this->authorize('modules', 'tag:store');

        return Inertia::render('Backend/core/tag/save');
    }

    /**
     * Lưu tag mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse
    {
        $this->authorize('modules', 'tag:store');

        $response = $this->service->create($request);
        
        return $this->handleAction($request, $response, redirectRoute: 'tag.index');
    }

    /**
     * Hiển thị form chỉnh sửa tag
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response
    {
        $this->authorize('modules', 'tag:update');

        $tag = $this->service->findById($id);
        
        return Inertia::render('Backend/core/tag/save', [
            'record' => $tag
        ]);
    }

    /**
     * Cập nhật tag
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse
    {
        $this->authorize('modules', 'tag:update');

        $response = $this->service->update($id, $request);
        
        return $this->handleAction($request, $response, redirectRoute: 'tag.index', editRoute: 'tag.edit');
    }

    /**
     * Xóa tag
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id): RedirectResponse
    {
        $this->authorize('modules', 'tag:delete');

        $response = $this->service->destroy($id);
        
        if ($response) {
            return redirect()->route('tag.index')
                ->with('success', Lang::get('messages.delete_success'));
        }

        return redirect()->back()
            ->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Tìm kiếm tag theo từ khóa
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function search(Request $request): JsonResponse
    {
        $keyword = $request->input('q', '');
        $searchRequest = new Request([
            'type' => 'all',
            'q' => $keyword,
            'limit' => 10,
            'sort' => 'name,asc'
        ]);
        
        $tags = $this->service->paginate($searchRequest);
        
        return response()->json($tags->map(function ($tag) {
            return [
                'id' => $tag->id,
                'name' => $tag->name
            ];
        })->toArray());
    }
}
