<?php   
namespace App\Http\Controllers\Backend\V1\Post;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Post\Post\StoreRequest;
use App\Http\Requests\Post\Post\UpdateRequest;
use App\Http\Requests\Post\Post\BulkDestroyRequest;
use App\Http\Requests\Post\Post\BulkUpdateRequest;
use App\Services\Interfaces\Post\PostServiceInterface as PostService;
use App\Services\Interfaces\Post\PostCatalogueServiceInterface as PostCatalogueService;
use App\Services\Interfaces\Setting\LanguageServiceInterface as LanguageService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Post\PostResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class PostController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $postCatalogueService;
    private $languageService;

    public function __construct(
        PostService $service,
        UserService $userService,
        PostCatalogueService $postCatalogueService,
        LanguageService $languageService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        $this->postCatalogueService = $postCatalogueService;
        $this->languageService = $languageService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách bài viết
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'post:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $catalogues = $this->postCatalogueService->getNestedsetDropdown();
        $languages = $this->languageService->paginate(new Request(['type' => 'all', 'publish' => '2']));
        
        $requestData = $this->service->formatRequestDataForFrontend($request);
        
        return Inertia::render('backend/post/post/index', [
            'records' => PostResource::collection($records)->resource,
            'users' => $users,
            'catalogues' => $catalogues,
            'languages' => $languages,
            'request' => $requestData
        ]);
    }

    /**
     * Hiển thị form tạo mới bài viết
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'post:store');
        
        $catalogues = $this->postCatalogueService->getNestedsetDropdown();
        return Inertia::render('backend/post/post/save', [
            'catalogues' => $catalogues
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa bài viết
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'post:update');
        $record = $this->service->show($id);
        
        $catalogues = $this->postCatalogueService->getNestedsetDropdown();
        return Inertia::render('backend/post/post/save', [
            'record' => new PostResource($record),
            'catalogues' => $catalogues
        ]);
    }

    /**
     * Lưu bài viết mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'post:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'post.index');
    }

    /**
     * Cập nhật bài viết
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'post:update');
        $response = $this->service->save($request, $id);
        
        $onlyOrder = $request->has('order') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'post_catalogue_id', 'post_catalogues', 'publish']);
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'post_catalogue_id', 'post_catalogues', 'order']);
        
        if($onlyOrder || $onlyPublish){
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'post.index', editRoute: 'post.edit');
    }

    /**
     * Xóa bài viết
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'post:delete');
        $response = $this->service->destroy($id);
        return to_route('post.index');
    }

    /**
     * Xóa nhiều bài viết cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'post:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều bài viết cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'post:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }


}