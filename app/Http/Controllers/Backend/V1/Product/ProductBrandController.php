<?php   
namespace App\Http\Controllers\Backend\V1\Product;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Product\ProductBrand\StoreRequest;
use App\Http\Requests\Product\ProductBrand\UpdateRequest;
use App\Http\Requests\Product\ProductBrand\BulkDestroyRequest;
use App\Http\Requests\Product\ProductBrand\BulkUpdateRequest;
use App\Services\Interfaces\Product\ProductBrandServiceInterface as ProductBrandService;
use App\Services\Interfaces\Setting\LanguageServiceInterface as LanguageService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Product\ProductBrandResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ProductBrandController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;
    private $languageService;

    public function __construct(
        ProductBrandService $service,
        UserService $userService,
        LanguageService $languageService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        $this->languageService = $languageService;
        parent::__construct($service);
    }

    public function index(Request $request): Response{
        $this->authorize('modules', 'product_brand:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request(['type' => 'all', 'sort' => 'name,asc']));
        $languages = $this->languageService->paginate(new Request(['type' => 'all', 'publish' => '2']));
        
        return Inertia::render('backend/product/product_brand/index', [
            'records' => ProductBrandResource::collection($records)->resource,
            'users' => $users,
            'languages' => $languages,
            'request' => $request->all()
        ]);
    }

    public function create(): Response {
        $this->authorize('modules', 'product_brand:store');
        return Inertia::render('backend/product/product_brand/save');
    }

    public function edit($id): Response {
        $this->authorize('modules', 'product_brand:update');
        $record = $this->service->show($id);
        return Inertia::render('backend/product/product_brand/save', [
            'record' => new ProductBrandResource($record)
        ]);
    }

    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'product_brand:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'product_brand.index');
    }

    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'product_brand:update');
        $response = $this->service->save($request, $id);
        
        $onlyOrder = $request->has('order') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'publish']);
        $onlyPublish = $request->has('publish') && !$request->hasAny(['name', 'description', 'content', 'canonical', 'meta_title', 'image', 'album', 'order']);
        
        if($onlyOrder || $onlyPublish){
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'product_brand.index', editRoute: 'product_brand.edit');
    }

    public function destroy($id){
        $this->authorize('modules', 'product_brand:delete');
        $response = $this->service->destroy($id);
        return to_route('product_brand.index');
    }

    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'product_brand:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'product_brand:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

}

