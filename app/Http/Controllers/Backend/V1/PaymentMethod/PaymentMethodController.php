<?php

namespace App\Http\Controllers\Backend\V1\PaymentMethod;

use App\Http\Controllers\Backend\BaseController;
use App\Services\Interfaces\PaymentMethod\PaymentMethodServiceInterface;
use App\Services\Interfaces\BankAccount\BankAccountServiceInterface;
use App\Services\Interfaces\ManualPaymentMethod\ManualPaymentMethodServiceInterface;
use App\Http\Requests\PaymentMethod\ConnectPaymentMethodRequest;
use App\Http\Requests\PaymentMethod\StorePaymentMethodRequest;
use App\Http\Requests\PaymentMethod\UpdatePaymentMethodRequest;
use App\Http\Requests\PaymentMethod\StoreBankAccountRequest;
use App\Http\Requests\PaymentMethod\UpdateBankAccountRequest;
use App\Http\Requests\PaymentMethod\StoreManualPaymentMethodRequest;
use App\Http\Requests\PaymentMethod\UpdateManualPaymentMethodRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Support\Facades\Lang;

class PaymentMethodController extends BaseController
{
    use AuthorizesRequests;

    protected $service;
    protected $bankAccountService;
    protected $manualPaymentMethodService;

    public function __construct(
        PaymentMethodServiceInterface $service,
        BankAccountServiceInterface $bankAccountService,
        ManualPaymentMethodServiceInterface $manualPaymentMethodService
    )
    {
        $this->service = $service;
        $this->bankAccountService = $bankAccountService;
        $this->manualPaymentMethodService = $manualPaymentMethodService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách phương thức thanh toán
     * Bao gồm các phương thức tích hợp, phương thức thủ công và thông tin chi tiết
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'setting:index');
        
        $integratedMethods = $this->service->getIntegratedMethods();
        $manualMethods = $this->service->getManualMethods();
        $defaultMethod = $this->service->getDefaultMethod();

        $bankTransferMethod = collect($manualMethods)->firstWhere('code', 'bank_transfer');
        $bankAccounts = [];
        $manualPaymentMethodDetails = [];
        
        if ($bankTransferMethod) {
            $bankAccounts = $this->bankAccountService->getBankAccountsForPaymentMethod($bankTransferMethod['id']);
            $manualPaymentMethodDetails = $this->manualPaymentMethodService->getDetailsForPaymentMethod($bankTransferMethod['id']);
        }

        return Inertia::render('backend/setting/payment-methods/index', [
            'integratedMethods' => $integratedMethods,
            'manualMethods' => $manualMethods,
            'defaultMethod' => $defaultMethod,
            'bankAccounts' => $bankAccounts,
            'bankTransferMethodDetails' => $manualPaymentMethodDetails,
        ]);
    }

    /**
     * Kết nối phương thức thanh toán tích hợp (VNPAY, SEAPAY, PAYPAL)
     *
     * @param ConnectPaymentMethodRequest $request
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function connect(ConnectPaymentMethodRequest $request)
    {
        $this->authorize('modules', 'setting:update');
        
        try {
            $result = $this->service->connect($request->validated());
            return $this->handleResponse($request, true, Lang::get('messages.save_success'), $result);
        } catch (\Exception $e) {
            return $this->handleResponse($request, false, $e->getMessage());
        }
    }

    /**
     * Ngắt kết nối phương thức thanh toán tích hợp
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function disconnect(Request $request, int $id)
    {
        $this->authorize('modules', 'setting:update');
        
        $result = $this->service->disconnect($id);
        
        if ($result) {
            return $this->handleResponse($request, true, Lang::get('messages.save_success'));
        }
        
        return $this->handleResponse($request, false, Lang::get('messages.save_failed'));
    }

    /**
     * Đặt phương thức thanh toán làm mặc định
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function setDefault(Request $request, int $id)
    {
        $this->authorize('modules', 'setting:update');
        
        $result = $this->service->setDefault($id);
        
        if ($result) {
            return $this->handleResponse($request, true, Lang::get('messages.save_success'));
        }
        
        return $this->handleResponse($request, false, Lang::get('messages.save_failed'));
    }

    /**
     * Tạo phương thức thanh toán thủ công mới
     *
     * @param StorePaymentMethodRequest $request
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function store(StorePaymentMethodRequest $request)
    {
        $this->authorize('modules', 'setting:update');
        
        try {
            $validated = $request->validated();
            $validated['status'] = 'active';
            $result = $this->service->save(new Request($validated));
            return $this->handleResponse($request, true, Lang::get('messages.save_success'), $result);
        } catch (\Exception $e) {
            return $this->handleResponse($request, false, $e->getMessage());
        }
    }

    /**
     * Cập nhật thông tin phương thức thanh toán
     *
     * @param UpdatePaymentMethodRequest $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function update(UpdatePaymentMethodRequest $request, int $id)
    {
        $this->authorize('modules', 'setting:update');
        
        try {
            $result = $this->service->save($request, $id);
            return $this->handleResponse($request, true, Lang::get('messages.save_success'), $result);
        } catch (\Exception $e) {
            return $this->handleResponse($request, false, $e->getMessage());
        }
    }

    /**
     * Xóa phương thức thanh toán
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function destroy(Request $request, int $id)
    {
        $this->authorize('modules', 'setting:update');
        
        $result = $this->service->destroy($id);
        
        if ($result) {
            $message = Lang::get('messages.delete_success');
            return $this->handleResponse($request, true, $message, null, 'delete');
        }
        
        return $this->handleResponse($request, false, Lang::get('messages.delete_failed'), null, 'delete');
    }

    /**
     * Tạo tài khoản ngân hàng thụ hưởng mới
     *
     * @param StoreBankAccountRequest $request
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function storeBankAccount(StoreBankAccountRequest $request)
    {
        $this->authorize('modules', 'setting:update');
        
        try {
            $validated = $request->validated();
            unset($validated['bank_bin']);
            $result = $this->bankAccountService->save(new Request($validated));
            return $this->handleResponse($request, true, Lang::get('messages.save_success'), $result);
        } catch (\Exception $e) {
            return $this->handleResponse($request, false, $e->getMessage());
        }
    }

    /**
     * Cập nhật thông tin tài khoản ngân hàng thụ hưởng
     *
     * @param UpdateBankAccountRequest $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function updateBankAccount(UpdateBankAccountRequest $request, int $id)
    {
        $this->authorize('modules', 'setting:update');
        
        try {
            $result = $this->bankAccountService->save($request, $id);
            return $this->handleResponse($request, true, Lang::get('messages.save_success'), $result);
        } catch (\Exception $e) {
            return $this->handleResponse($request, false, $e->getMessage());
        }
    }

    /**
     * Xóa tài khoản ngân hàng thụ hưởng
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function destroyBankAccount(Request $request, int $id)
    {
        $this->authorize('modules', 'setting:update');
        
        $result = $this->bankAccountService->destroy($id);
        
        if ($result) {
            $message = Lang::get('messages.delete_success');
            return $this->handleResponse($request, true, $message, null, 'delete');
        }
        
        return $this->handleResponse($request, false, Lang::get('messages.delete_failed'), null, 'delete');
    }

    /**
     * Tạo hoặc cập nhật cấu hình phương thức thanh toán thủ công
     *
     * @param StoreManualPaymentMethodRequest $request
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function storeManualPaymentMethod(StoreManualPaymentMethodRequest $request)
    {
        $this->authorize('modules', 'setting:update');
        
        try {
            $result = $this->manualPaymentMethodService->saveOrUpdate($request);
            return $this->handleResponse($request, true, Lang::get('messages.save_success'), $result);
        } catch (\Exception $e) {
            return $this->handleResponse($request, false, $e->getMessage());
        }
    }

    /**
     * Cập nhật cấu hình phương thức thanh toán thủ công
     *
     * @param UpdateManualPaymentMethodRequest $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    public function updateManualPaymentMethod(UpdateManualPaymentMethodRequest $request, int $id)
    {
        $this->authorize('modules', 'setting:update');
        
        try {
            $result = $this->manualPaymentMethodService->saveOrUpdate($request, $id);
            return $this->handleResponse($request, true, Lang::get('messages.save_success'), $result);
        } catch (\Exception $e) {
            return $this->handleResponse($request, false, $e->getMessage());
        }
    }

    /**
     * Xử lý response thống nhất cho Inertia và JSON requests
     *
     * @param Request $request
     * @param bool $success
     * @param string $message
     * @param mixed $data
     * @param string $action
     * @return \Illuminate\Http\RedirectResponse|JsonResponse
     */
    protected function handleResponse(Request $request, bool $success, string $message, $data = null, string $action = 'save')
    {
        $isInertia = $request->header('X-Inertia') || !$request->wantsJson();
        
        if ($isInertia) {
            if ($success) {
                return redirect()->back()->with('success', $message);
            }
            return redirect()->back()->withErrors(['error' => $message]);
        }
        
        $statusCode = $success ? 200 : 422;
        $response = [
            'success' => $success,
            'message' => $message,
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        return response()->json($response, $statusCode);
    }
}
