<?php

namespace App\Services\Impl\V1\CashBook;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\CashBook\CashTransactionServiceInterface;
use App\Repositories\CashBook\CashTransactionRepo;
use App\Models\CashTransaction;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;

class CashTransactionService extends BaseCacheService implements CashTransactionServiceInterface {

    // Cache strategy: 'none' cho transactions vì thay đổi liên tục
    protected string $cacheStrategy = 'none';
    protected string $module = 'cash_transactions';

    protected $repository;
    protected $updateId = null; // Track if we're updating

    protected $with = ['reason', 'store', 'recipientStore', 'creator'];
    protected $simpleFilter = ['publish', 'transaction_type', 'payment_method', 'store_id'];
    protected $searchFields = ['transaction_code', 'reference_code', 'description'];
    protected $sort = ['transaction_date', 'desc'];

    public function __construct(
        CashTransactionRepo $repository
    )
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    /**
     * Override save to track update ID
     */
    public function save(Request $request, ?int $id = null)
    {
        $this->updateId = $id;
        return parent::save($request, $id);
    }

    protected function prepareModelData(): static {
        // Check if this is an update operation
        $isUpdate = !is_null($this->updateId);
        
        if ($isUpdate) {
            // When updating, only allow editing description and attachments
            // Other fields cannot be changed - must delete and recreate if needed
            $this->modelData = [
                'description' => $this->request->input('description'),
            ];

            // Handle attachments if any
            if ($this->request->hasFile('attachments')) {
                $files = $this->request->file('attachments');
                $this->modelData['attachments'] = $this->handleAttachments(is_array($files) ? $files : [$files]);
            }
            
            // Reset updateId after use
            $this->updateId = null;
            return $this;
        }

        // For create operation, allow all fields
        $transactionType = $this->request->input('transaction_type');

        // Generate transaction code if not provided
        $transactionCode = $this->request->input('transaction_code');
        if (empty($transactionCode)) {
            $transactionCode = $this->generateTransactionCode($transactionType);
        }

        $this->modelData = [
            'transaction_code' => $transactionCode,
            'transaction_type' => $transactionType,
            'payment_method' => $this->request->input('payment_method', 'cash'),
            'reason_id' => $this->request->input('reason_id'),
            'amount' => $this->request->input('amount'),
            'description' => $this->request->input('description'),
            'transaction_date' => $this->request->input('transaction_date'),
            'reference_code' => $this->request->input('reference_code'),
            'publish' => $this->request->input('publish', '2'),
            'order' => $this->request->input('order', 0),
            'user_id' => Auth::id(),
        ];

        // Add partner info for receipt/payment
        if (in_array($transactionType, ['receipt', 'payment'])) {
            $this->modelData['partner_group'] = $this->request->input('partner_group');
            $this->modelData['partner_id'] = $this->request->input('partner_id');
            $this->modelData['partner_name'] = $this->request->input('partner_name');
            $this->modelData['store_id'] = $this->request->input('store_id');
        }

        // Add store info for transfer
        if ($transactionType === 'transfer') {
            $this->modelData['store_id'] = $this->request->input('store_id');
            $this->modelData['recipient_store_id'] = $this->request->input('recipient_store_id');
        }

        // Handle attachments if any
        if ($this->request->hasFile('attachments')) {
            $files = $this->request->file('attachments');
            $this->modelData['attachments'] = $this->handleAttachments(is_array($files) ? $files : [$files]);
        }

        return $this;
    }

    /**
     * Get transactions with filters
     */
    public function getWithFilters(array $filters = [])
    {
        $query = $this->repository->getModel()
            ->with(['reason', 'store', 'recipientStore'])
            ->where('publish', '2');

        // Apply filters
        if (!empty($filters['transaction_type'])) {
            $query->where('transaction_type', $filters['transaction_type']);
        }

        if (!empty($filters['store_id'])) {
            $query->where(function($q) use ($filters) {
                $q->where('store_id', $filters['store_id'])
                  ->orWhere('recipient_store_id', $filters['store_id']);
            });
        }

        if (!empty($filters['start_date'])) {
            $query->where('transaction_date', '>=', $filters['start_date']);
        }

        if (!empty($filters['end_date'])) {
            $query->where('transaction_date', '<=', $filters['end_date']);
        }

        return $query->orderBy('transaction_date', 'desc')->get();
    }

    /**
     * Get balance statistics
     */
    public function getBalanceStats(array $filters = [])
    {
        return $this->repository->getBalanceStats($filters);
    }

    /**
     * Generate transaction code
     */
    public function generateTransactionCode(string $type): string
    {
        return CashTransaction::generateTransactionCode($type);
    }

    /**
     * Handle file uploads for attachments
     */
    public function handleAttachments(array $files): array
    {
        $uploadedFiles = [];

        foreach ($files as $file) {
            if ($file && $file->isValid()) {
                $path = $file->store('cash-transactions', 'public');
                $uploadedFiles[] = $path;
            }
        }

        return $uploadedFiles;
    }

    /**
     * Override destroy to delete attachments
     */
    protected function beforeDelete($id): static
    {
        if(!$this->model){
            $this->findById($id);
        }

        // Delete attachments if exist
        if ($this->model && $this->model->attachments) {
            foreach ($this->model->attachments as $file) {
                if (Storage::disk('public')->exists($file)) {
                    Storage::disk('public')->delete($file);
                }
            }
        }

        return $this;
    }

    /**
     * Override paginate to handle custom filters
     */
    public function paginate($request)
    {
        $condition['keyword'] = $request->input('keyword');
        $condition['publish'] = $request->input('publish');
        $condition['transaction_type'] = $request->input('transaction_type');
        $condition['store_id'] = $request->input('store_id');
        
        $perPage = $request->integer('perpage', 20);
        
        $extend = [];
        // Handle date range
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        
        if($startDate && $endDate){
             $extend['customWhere'] = function($query) use ($startDate, $endDate) {
                 $query->whereBetween('transaction_date', [$startDate, $endDate]);
             };
        } elseif ($startDate) {
             $extend['customWhere'] = function($query) use ($startDate) {
                 $query->where('transaction_date', '>=', $startDate);
             };
        } elseif ($endDate) {
             $extend['customWhere'] = function($query) use ($endDate) {
                 $query->where('transaction_date', '<=', $endDate);
             };
        }

        return $this->repository->pagination(
             ['*'], 
             $condition, 
             $perPage, 
             $extend,
             $this->sort ?? ['transaction_date', 'DESC'], 
             [], 
             $this->with ?? []
        );
    }
}
