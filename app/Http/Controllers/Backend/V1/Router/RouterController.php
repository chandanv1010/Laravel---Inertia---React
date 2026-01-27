<?php   
namespace App\Http\Controllers\Backend\V1\Router;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use App\Services\Interfaces\Router\RouterServiceInterface as RouterService;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class RouterController extends BaseController{

    use AuthorizesRequests;

    protected $service;

    public function __construct(
        RouterService $service
    )
    {
        $this->service = $service;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách router
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'router:index');
        
        $records = $this->service->paginate($request);
        
        $modules = \App\Models\Router::select('module')
            ->distinct()
            ->orderBy('module')
            ->pluck('module')
            ->map(fn($m) => ['value' => $m, 'label' => ucfirst(str_replace('_', ' ', $m))])
            ->toArray();

        $languages = \App\Models\Language::select('id', 'name', 'canonical', 'image')->get();

        return Inertia::render('backend/router/index', [
            'records' => $records,
            'modules' => $modules,
            'languages' => $languages,
        ]);
    }

    /**
     * Cập nhật cấu hình chuyển hướng router
     *
     * @param Request $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(Request $request, $id){
        $this->authorize('modules', 'router:update');

        $router = \App\Models\Router::findOrFail($id);
        
        $router->update([
            'redirect' => $request->input('redirect'),
            'redirect_type' => $request->input('redirect_type') ?? 301
        ]);

        return back()->with('success', 'Cập nhật cấu hình chuyển hướng thành công!');
    }
}
