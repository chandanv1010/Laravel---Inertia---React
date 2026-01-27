<?php   
namespace App\Http\Controllers\Backend\V1\Setting;
use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Http\Requests\Setting\Language\StoreRequest;
use App\Http\Requests\Setting\Language\UpdateRequest;
use App\Http\Requests\Setting\Language\BulkDestroyRequest;
use App\Http\Requests\Setting\Language\BulkUpdateRequest;
use App\Services\Interfaces\Setting\LanguageServiceInterface as LanguageService;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\Setting\LanguageResource;
use Illuminate\Http\Request;
use App\Services\Interfaces\User\UserServiceInterface as UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class LanguageController extends BaseController{

    use AuthorizesRequests;

    protected $service;
    private $userService;

    public function __construct(
        LanguageService $service,
        UserService $userService
    )
    {
        $this->service = $service;
        $this->userService = $userService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách ngôn ngữ
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response{
        $this->authorize('modules', 'language:index');
        
        $records = $this->service->paginate($request);
        $users = $this->userService->setWith([])->paginate(new Request()->merge(['type' => 'all', 'sort' => 'name,asc']));
        return Inertia::render('backend/setting/language/index', [
            'records' => $records,
            'users' => [],
            'request' => $request->all()
        ]);
    }

    /**
     * Hiển thị form tạo mới ngôn ngữ
     *
     * @return Response
     */
    public function create(): Response {
        $this->authorize('modules', 'language:store');
        
        return Inertia::render('backend/setting/language/save');
    }

    /**
     * Hiển thị form chỉnh sửa ngôn ngữ
     *
     * @param int $id
     * @return Response
     */
    public function edit($id): Response {
        $this->authorize('modules', 'language:update');
        $record = $this->service->show($id);
        
        return Inertia::render('backend/setting/language/save', [
            'record' => $record,
        ]);
    }

    /**
     * Lưu ngôn ngữ mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse{
        $this->authorize('modules', 'language:store');
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'language.index');
    }

    /**
     * Cập nhật ngôn ngữ
     *
     * @param UpdateRequest $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, $id): RedirectResponse {
        $this->authorize('modules', 'language:update');
        $response = $this->service->save($request, $id);
        return $this->handleAction($request, $response, redirectRoute: 'language.index', editRoute: 'language.edit');
    }

    /**
     * Xóa ngôn ngữ
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id){
        $this->authorize('modules', 'language:delete');
        $response = $this->service->destroy($id);
        return to_route('language.index');
    }

    /**
     * Xóa nhiều ngôn ngữ cùng lúc
     *
     * @param BulkDestroyRequest $request
     * @return RedirectResponse
     */
    public function bulkDestroy(BulkDestroyRequest $request){
        $this->authorize('modules', 'language:bulkDestroy');
        $response = $this->service->bulkDestroy($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.delete_success'))
                         : redirect()->back()->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều ngôn ngữ cùng lúc
     *
     * @param BulkUpdateRequest $request
     * @return RedirectResponse
     */
    public function bulkUpdate(BulkUpdateRequest $request){
        $this->authorize('modules', 'language:bulkUpdate');
        $response = $this->service->bulkUpdate($request);
        return $response ? redirect()->back()->with('success', Lang::get('messages.save_success'))
                         : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

}