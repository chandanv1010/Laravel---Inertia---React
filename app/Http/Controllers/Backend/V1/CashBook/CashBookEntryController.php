<?php

namespace App\Http\Controllers\Backend\V1\CashBook;

use App\Http\Controllers\Backend\BaseController;
use App\Services\Interfaces\CashBook\CashBookEntryServiceInterface;
use App\Services\Interfaces\BankAccount\BankAccountServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Lang;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class CashBookEntryController extends BaseController
{
    use AuthorizesRequests;

    /** @var CashBookEntryServiceInterface */
    protected $service;
    
    /** @var BankAccountServiceInterface */
    private $bankAccountService;

    public function __construct(
        CashBookEntryServiceInterface $service,
        BankAccountServiceInterface $bankAccountService
    )
    {
        $this->service = $service;
        $this->bankAccountService = $bankAccountService;
        parent::__construct($service);
    }

    public function index(Request $request): Response
    {
        $this->authorize('modules', 'cash_book:index');
        
        $records = $this->service->paginate($request);
        $statistics = $this->service->getStatistics($request->only(['start_date', 'end_date']));
        
        return Inertia::render('backend/cash-book/cash-book-entry/index', [
            'records' => $records,
            'statistics' => $statistics,
            'request' => $request->all()
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('modules', 'cash_book:store');
        
        $entryType = $request->get('type', 'income');
        $bankAccounts = $this->bankAccountService->getDropdown();
        
        return Inertia::render('backend/cash-book/cash-book-entry/save', [
            'entryType' => $entryType,
            'bankAccounts' => $bankAccounts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('modules', 'cash_book:store');
        
        $response = $this->service->save($request);
        return $this->handleAction($request, $response, redirectRoute: 'cash_book.index');
    }

    public function edit($id): Response
    {
        $this->authorize('modules', 'cash_book:update');
        $record = $this->service->show($id);
        
        $bankAccounts = $this->bankAccountService->getDropdown();
        
        $recordData = [
            'id' => $record->id,
            'code' => $record->code,
            'entry_type' => $record->entry_type,
            'amount' => $record->amount ? (float)$record->amount : 0,
            'description' => $record->description,
            'category' => $record->category,
            'from_account_id' => $record->from_account_id,
            'to_account_id' => $record->to_account_id,
            'reference' => $record->reference,
            'entry_date' => $record->entry_date ? $record->entry_date->format('Y-m-d') : null,
            'status' => $record->status,
        ];
        
        return Inertia::render('backend/cash-book/cash-book-entry/save', [
            'record' => $recordData,
            'entryType' => $record->entry_type,
            'bankAccounts' => $bankAccounts,
        ]);
    }

    public function update(Request $request, $id): RedirectResponse
    {
        $this->authorize('modules', 'cash_book:update');
        
        $response = $this->service->save($request, $id);
        
        $onlyPublish = $request->has('publish') && !$request->hasAny(['code', 'entry_type', 'amount', 'description']);
        
        if ($onlyPublish) {
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        
        return $this->handleAction($request, $response, redirectRoute: 'cash_book.index', editRoute: 'cash_book.edit');
    }

    public function destroy($id): RedirectResponse
    {
        $this->authorize('modules', 'cash_book:delete');
        
        $response = $this->service->destroy($id);
        return redirect()->route('cash_book.index')
            ->with('success', Lang::get('messages.delete_success'));
    }

    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('modules', 'cash_book:index');
        
        $statistics = $this->service->getStatistics($request->only(['start_date', 'end_date']));
        
        return response()->json($statistics);
    }
}
