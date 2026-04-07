<?php   
namespace App\Http\Controllers\Backend\V1\Order;

use App\Http\Controllers\Backend\BaseController;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use App\Services\Interfaces\Order\OrderServiceInterface as OrderService;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class OrderController extends BaseController {

    use AuthorizesRequests;

    protected $service;

    public function __construct(
        OrderService $service
    )
    {
        $this->service = $service;
        parent::__construct($service);
    }

    /**
     * Display a listing of orders
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response {
        $this->authorize('modules', 'order:index');
        
        $records = $this->service->paginate($request);
        
        return Inertia::render('backend/order/index', [
            'records' => $records,
            'request' => $request->all()
        ]);
    }

    /**
     * Display the specified order
     *
     * @param int $id
     * @return Response
     */
    public function show(int $id): Response {
        $this->authorize('modules', 'order:show');
        $record = $this->service->getOrderByCode($id); // Or findById
        if (!$record) {
            $record = $this->service->show($id);
        }
        
        $cashReasons = \App\Models\CashReason::receipt()->get();
        
        return Inertia::render('backend/order/show', [
            'record' => $record,
            'cashReasons' => $cashReasons
        ]);
    }

    /**
     * Update order status
     *
     * @param Request $request
     * @param int $id
     * @return RedirectResponse
     */
    public function update(Request $request, $id): RedirectResponse {
        $this->authorize('modules', 'order:update');
        $response = $this->service->save($request, $id);
        return redirect()->back();
    }
}
