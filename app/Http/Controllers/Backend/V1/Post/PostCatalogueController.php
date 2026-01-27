<?php   
namespace App\Http\Controllers\Backend\V1\Post;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Post\PostCatalogue\StoreRequest;
use App\Http\Requests\Post\PostCatalogue\UpdateRequest;
use App\Http\Requests\Post\PostCatalogue\BulkDestroyRequest;
use App\Http\Requests\Post\PostCatalogue\BulkUpdateRequest;
use App\Services\Interfaces\Post\PostCatalogueServiceInterface as PostCatalogueService;
use App\Services\Interfaces\Setting\LanguageServiceInterface as LanguageService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Post\PostCatalogueResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class PostCatalogueController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $languageService;

    public function __construct(
        PostCatalogueService $service,
        UserService $userService,
        LanguageService $languageService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        $this->languageService = $languageService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách nhóm bài viết
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'post_catalogue:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $languages = $this->languageService->paginate(new Request(['type' => 'all', 'publish' => '2']));
        
        return Inertia::render('backend/post/post_catalogue/index', [
            'records' => PostCatalogueResource::collection($records)->resource,
            'users' => $users,
            'languages' => $languages,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới nhóm bài viết
     *
     * @return Response
     */
    public function create(): Response {
        $catalogues = $this->service->getNestedsetDropdown();
        $this->authorize('modules', 'post_catalogue:store');
        
        return Inertia::render('backend/post/post_catalogue/save', [
            'catalogues' => $catalogues
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa nhóm bài viết
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'post_catalogue:update');
        $record = $this->service->show($id);
        
        $catalogues = $this->service->getNestedsetDropdown();
        return Inertia::render('backend/post/post_catalogue/save', [
            'record' => new PostCatalogueResource($record), 
            'catalogues' => $catalogues 
        ]);
    }

    /**
     * Lưu nhóm bài viết mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'post_catalogue:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'post_catalogue.index');
    }

    /**
     * Cập nhật nhóm bài viết
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'post_catalogue:update');
        $response = $this->service->save($request, $id);
        
        $onlyOrder = $request->has('order') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'parent_id', 'publish']);
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'parent_id', 'order']);
        
        if($onlyOrder || $onlyPublish){
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'post_catalogue.index', editRoute: 'post_catalogue.edit');
    }

    /**
     * Xóa nhóm bài viết
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'post_catalogue:delete');
        try {
        $response = $this->service->destroy($id);
            if($response){
                return to_route('post_catalogue.index')->with('success', Lang::get('messages.delete_success'));
            }
            return to_route('post_catalogue.index')->with('error', Lang::get('messages.delete_failed'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Xóa nhiều nhóm bài viết cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'post_catalogue:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều nhóm bài viết cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'post_catalogue:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

}