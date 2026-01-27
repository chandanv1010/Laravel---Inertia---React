<?php   
namespace App\Http\Controllers\Backend\V1\Product;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Product\ProductCatalogue\StoreRequest;
use App\Http\Requests\Product\ProductCatalogue\UpdateRequest;
use App\Http\Requests\Product\ProductCatalogue\BulkDestroyRequest;
use App\Http\Requests\Product\ProductCatalogue\BulkUpdateRequest;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface as ProductCatalogueService;
use App\Services\Interfaces\Setting\LanguageServiceInterface as LanguageService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Product\ProductCatalogueResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ProductCatalogueController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $languageService;

    public function __construct(
        ProductCatalogueService $service,
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
     * Hiển thị danh sách nhóm sản phẩm
     *
     * @param Request $request
     * @return Response|\Illuminate\Http\JsonResponse
     */
    public function index(Request $request): Response|\Illuminate\Http\JsonResponse{
        $this->authorize('modules', 'product_catalogue:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $languages = $this->languageService->paginate(new Request(['type' => 'all', 'publish' => '2']));
        
        if ($request->wantsJson()) {
            return response()->json([
                'data' => ProductCatalogueResource::collection($records)->resource->items(),
                'pagination' => [
                    'current_page' => $records->currentPage(),
                    'last_page' => $records->lastPage(),
                    'per_page' => $records->perPage(),
                    'total' => $records->total(),
                ]
            ]);
        }
        
        return Inertia::render('backend/product/product_catalogue/index', [
            'records' => ProductCatalogueResource::collection($records)->resource,
            'users' => $users,
            'languages' => $languages,
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới nhóm sản phẩm
     *
     * @return Response
     */
    public function create(): Response {
        $catalogues = $this->service->getNestedsetDropdown();
        $this->authorize('modules', 'product_catalogue:store');
        
        return Inertia::render('backend/product/product_catalogue/save', [
            'catalogues' => $catalogues
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa nhóm sản phẩm
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'product_catalogue:update');
        $record = $this->service->show($id);
        
        $catalogues = $this->service->getNestedsetDropdown();
        return Inertia::render('backend/product/product_catalogue/save', [
            'record' => new ProductCatalogueResource($record), 
            'catalogues' => $catalogues 
        ]);
    }

    /**
     * Lưu nhóm sản phẩm mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'product_catalogue:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'product_catalogue.index');
    }

    /**
     * Cập nhật nhóm sản phẩm
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'product_catalogue:update');
        $response = $this->service->save($request, $id);
        
        $onlyOrder = $request->has('order') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'parent_id', 'publish']);
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'parent_id', 'order']);
        
        if($onlyOrder || $onlyPublish){
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'product_catalogue.index', editRoute: 'product_catalogue.edit');
    }

    /**
     * Xóa nhóm sản phẩm
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'product_catalogue:delete');
        try {
        $response = $this->service->destroy($id);
            if($response){
                return to_route('product_catalogue.index')->with('success', Lang::get('messages.delete_success'));
            }
            return to_route('product_catalogue.index')->with('error', Lang::get('messages.delete_failed'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Xóa nhiều nhóm sản phẩm cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'product_catalogue:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều nhóm sản phẩm cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'product_catalogue:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

}

