<?php

namespace App\Http\Controllers\Backend\V1\CashBook;

use App\Http\Controllers\Backend\BaseController;
use App\Http\Requests\CashBook\CashTransaction\StoreRequest;
use App\Http\Requests\CashBook\CashTransaction\UpdateRequest;
use App\Services\Interfaces\CashBook\CashTransactionServiceInterface;
use App\Services\Interfaces\CashBook\CashReasonServiceInterface;
use App\Services\Interfaces\BankAccount\BankAccountServiceInterface;
use App\Services\Interfaces\Customer\CustomerServiceInterface;
use App\Services\Interfaces\Warehouse\SupplierServiceInterface;
use App\Services\Interfaces\User\UserServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Lang;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class CashTransactionController extends BaseController
{
    use AuthorizesRequests;

    /** @var CashTransactionServiceInterface */
    protected $service;
    
    /** @var CashReasonServiceInterface */
    protected $reasonService;
    
    /** @var BankAccountServiceInterface */
    protected $bankAccountService;
    
    /** @var CustomerServiceInterface */
    protected $customerService;
    
    /** @var SupplierServiceInterface */
    protected $supplierService;
    
    /** @var UserServiceInterface */
    protected $userService;

    public function __construct(
        CashTransactionServiceInterface $service,
        CashReasonServiceInterface $reasonService,
        BankAccountServiceInterface $bankAccountService,
        CustomerServiceInterface $customerService,
        SupplierServiceInterface $supplierService,
        UserServiceInterface $userService
    ) {
        $this->service = $service;
        $this->reasonService = $reasonService;
        $this->bankAccountService = $bankAccountService;
        $this->customerService = $customerService;
        $this->supplierService = $supplierService;
        $this->userService = $userService;
        parent::__construct($service);
    }

    /**
     * Hiển thị danh sách phiếu thu chi
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $this->authorize('modules', 'cash_book_transaction:index');

        if ($request->has('transaction_date.between')) {
            $dates = explode(',', $request->input('transaction_date.between'));
            if (count($dates) == 2) {
                $request->merge([
                    'start_date' => trim($dates[0]),
                    'end_date' => trim($dates[1]),
                ]);
            }
        }

        $transactions = $this->service->paginate($request);
        $stats = $this->service->getBalanceStats([
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
        ]);

        return Inertia::render('backend/cash-book/transaction/index', [
            'transactions' => $transactions,
            'stats' => $stats,
            'filters' => $request->only(['keyword', 'transaction_type', 'start_date', 'end_date', 'publish']),
        ]);
    }

    /**
     * Hiển thị form tạo phiếu thu
     *
     * @return Response
     */
    public function createReceipt(): Response
    {
        $this->authorize('modules', 'cash_book_transaction:store');

        $receiptReasons = $this->reasonService->getDropdown('receipt');
        $transactionCode = $this->service->generateTransactionCode('receipt');
        $bankAccounts = $this->bankAccountService->getDropdown();
        $initialPartners = $this->getInitialPartners();

        return Inertia::render('backend/cash-book/transaction/receipt', [
            'receiptReasons' => $receiptReasons,
            'generatedCode' => $transactionCode,
            'bankAccounts' => $bankAccounts,
            'initialCustomers' => $initialPartners['customers'],
            'initialSuppliers' => $initialPartners['suppliers'],
            'initialEmployees' => $initialPartners['employees'],
        ]);
    }

    /**
     * Hiển thị form tạo phiếu chi
     *
     * @return Response
     */
    public function createPayment(): Response
    {
        $this->authorize('modules', 'cash_book_transaction:store');

        $paymentReasons = $this->reasonService->getDropdown('payment');
        $transactionCode = $this->service->generateTransactionCode('payment');
        $bankAccounts = $this->bankAccountService->getDropdown();
        $initialPartners = $this->getInitialPartners();

        return Inertia::render('backend/cash-book/transaction/payment', [
            'paymentReasons' => $paymentReasons,
            'generatedCode' => $transactionCode,
            'bankAccounts' => $bankAccounts,
            'initialCustomers' => $initialPartners['customers'],
            'initialSuppliers' => $initialPartners['suppliers'],
            'initialEmployees' => $initialPartners['employees'],
        ]);
    }

    /**
     * Lấy danh sách đối tác ban đầu (20 mỗi loại) để hiển thị trên form
     *
     * @return array
     */
    private function getInitialPartners(): array
    {
        $limit = 20;
        
        $customerRequest = new Request(['type' => 'all', 'publish' => '2', 'perpage' => $limit]);
        $customerResult = $this->customerService->paginate($customerRequest);
        $customers = collect(method_exists($customerResult, 'items') ? $customerResult->items() : $customerResult)
            ->map(function($r) {
                return ['value' => $r->id, 'label' => trim(($r->last_name ?? '') . ' ' . ($r->first_name ?? '')) ?: $r->email];
            })
            ->values()
            ->toArray();

        $supplierRequest = new Request(['type' => 'all', 'publish' => '2', 'perpage' => $limit]);
        $supplierResult = $this->supplierService->paginate($supplierRequest);
        $suppliers = collect(method_exists($supplierResult, 'items') ? $supplierResult->items() : $supplierResult)
            ->map(function($r) {
                return ['value' => $r->id, 'label' => $r->name];
            })
            ->values()
            ->toArray();

        $employeeRequest = new Request(['type' => 'all', 'publish' => '2', 'perpage' => $limit]);
        $employeeResult = $this->userService->paginate($employeeRequest);
        $employees = collect(method_exists($employeeResult, 'items') ? $employeeResult->items() : $employeeResult)
            ->map(function($r) {
                return ['value' => $r->id, 'label' => $r->name ?: $r->email];
            })
            ->values()
            ->toArray();

        return [
            'customers' => $customers,
            'suppliers' => $suppliers,
            'employees' => $employees,
        ];
    }

    /**
     * Tìm kiếm đối tác theo loại và từ khóa
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function searchPartners(Request $request): JsonResponse
    {
        $type = $request->input('type');
        $keyword = $request->input('keyword', '');
        $limit = $request->input('limit', 20);

        $service = match($type) {
            'customer' => $this->customerService,
            'supplier' => $this->supplierService,
            'employee' => $this->userService,
            default => null
        };

        if (!$service) {
            return response()->json([]);
        }

        $searchRequest = new Request([
            'keyword' => $keyword,
            'type' => 'all',
            'publish' => '2',
            'perpage' => $limit,
        ]);

        $results = $service->paginate($searchRequest);

        $items = method_exists($results, 'items') ? $results->items() : $results;
        $partners = collect($items)->map(function($record) use ($type) {
            if ($type === 'customer') {
                $label = trim(($record->last_name ?? '') . ' ' . ($record->first_name ?? '')) ?: $record->email;
            } elseif ($type === 'employee') {
                $label = $record->name ?: $record->email;
            } else {
                $label = $record->name;
            }

            return [
                'value' => $record->id,
                'label' => $label,
            ];
        });

        return response()->json($partners);
    }

    /**
     * Hiển thị form tạo phiếu chuyển khoản
     *
     * @return Response
     */
    public function createTransfer(): Response
    {
        $this->authorize('modules', 'cash_book_transaction:store');

        $transactionCode = $this->service->generateTransactionCode('transfer');

        return Inertia::render('backend/cash-book/transaction/transfer', [
            'generatedCode' => $transactionCode,
        ]);
    }

    /**
     * Hiển thị form tạo phiếu thu chi theo loại
     *
     * @param Request $request
     * @return Response
     */
    public function create(Request $request): Response
    {
        $type = $request->input('type', 'receipt');
        
        return match($type) {
            'payment' => $this->createPayment(),
            'transfer' => $this->createTransfer(),
            default => $this->createReceipt(),
        };
    }

    /**
     * Lưu phiếu thu chi mới
     *
     * @param StoreRequest $request
     * @return RedirectResponse
     */
    public function store(StoreRequest $request): RedirectResponse
    {
        $this->authorize('modules', 'cash_book_transaction:store');

        $response = $this->service->save($request);
        
        return $this->handleAction($request, $response, redirectRoute: 'cash-book.transaction.index');
    }

    /**
     * Hiển thị chi tiết phiếu thu chi
     *
     * @param string $id
     * @return Response
     */
    public function show(string $id): Response
    {
        $this->authorize('modules', 'cash_book_transaction:show');

        $transaction = $this->service->show($id);
        
        return Inertia::render('backend/cash-book/transaction/show', [
            'transaction' => $transaction,
        ]);
    }

    /**
     * Hiển thị form chỉnh sửa phiếu thu chi
     *
     * @param string $id
     * @return Response
     */
    public function edit(string $id): Response
    {
        $this->authorize('modules', 'cash_book_transaction:update');

        $transaction = $this->service->show($id);
        $bankAccounts = $this->bankAccountService->getDropdown();
        $initialPartners = $this->getInitialPartners();

        $view = match($transaction->transaction_type) {
            'payment' => 'backend/cash-book/transaction/payment',
            'transfer' => 'backend/cash-book/transaction/transfer',
            default => 'backend/cash-book/transaction/receipt',
        };

        $props = [
            'transaction' => $transaction,
            'bankAccounts' => $bankAccounts,
            'generatedCode' => $transaction->transaction_code ?? $this->service->generateTransactionCode($transaction->transaction_type),
            'initialCustomers' => $initialPartners['customers'],
            'initialSuppliers' => $initialPartners['suppliers'],
            'initialEmployees' => $initialPartners['employees'],
        ];

        if ($transaction->transaction_type === 'receipt') {
            $props['receiptReasons'] = $this->reasonService->getDropdown('receipt');
        } elseif ($transaction->transaction_type === 'payment') {
            $props['paymentReasons'] = $this->reasonService->getDropdown('payment');
        }

        return Inertia::render($view, $props);
    }

    /**
     * Cập nhật phiếu thu chi
     *
     * @param UpdateRequest $request
     * @param string $id
     * @return RedirectResponse
     */
    public function update(UpdateRequest $request, string $id): RedirectResponse
    {
        $this->authorize('modules', 'cash_book_transaction:update');

        $response = $this->service->save($request, $id);
        
        return $this->handleAction($request, $response, redirectRoute: 'cash-book.transaction.index', editRoute: 'cash-book.transaction.edit');
    }

    /**
     * Xóa phiếu thu chi
     *
     * @param string $id
     * @return RedirectResponse
     */
    public function destroy(string $id): RedirectResponse
    {
        $this->authorize('modules', 'cash_book_transaction:delete');

        $response = $this->service->destroy($id);
        
        if ($response) {
            return redirect()->route('cash-book.transaction.index')
                ->with('success', Lang::get('messages.delete_success'));
        }

        return redirect()->back()
            ->with('error', Lang::get('messages.delete_failed'));
    }

    /**
     * Cập nhật nhiều phiếu thu chi cùng lúc
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function bulkUpdate(Request $request): RedirectResponse
    {
        $this->authorize('modules', 'cash_book_transaction:bulkUpdate');

        $response = $this->service->bulkUpdate($request);
        
        return $response 
            ? redirect()->back()->with('success', Lang::get('messages.save_success'))
            : redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Xuất dữ liệu phiếu thu chi
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        $this->authorize('modules', 'cash_book_transaction:index');

        return response()->json(['message' => 'Export feature coming soon']);
    }

    /**
     * Lấy thống kê số dư
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('modules', 'cash_book_transaction:index');

        $stats = $this->service->getBalanceStats([
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'store_id' => $request->input('store_id'),
        ]);

        return response()->json($stats);
    }

    /**
     * Tạo mã giao dịch tự động
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateCode(Request $request): JsonResponse
    {
        $this->authorize('modules', 'cash_book_transaction:store');
        
        $type = $request->input('type', 'receipt');
        $code = $this->service->generateTransactionCode($type);

        return response()->json(['code' => $code]);
    }
}
