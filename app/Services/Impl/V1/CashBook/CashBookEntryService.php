<?php

namespace App\Services\Impl\V1\CashBook;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\CashBook\CashBookEntryServiceInterface;
use App\Repositories\CashBook\CashBookEntryRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashBookEntryService extends BaseCacheService implements CashBookEntryServiceInterface
{
    protected string $cacheStrategy = 'default';
    protected string $module = 'cash_book_entries';

    protected $repository;

    protected $with = ['creators', 'fromAccount', 'toAccount'];
    protected $simpleFilter = ['status', 'entry_type', 'user_id'];
    protected $searchFields = ['code', 'description', 'reference'];
    protected $sort = ['id', 'desc'];

    public function __construct(CashBookEntryRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static
    {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        
        // Auto-generate code if not provided
        if (empty($this->modelData['code'])) {
            $this->modelData['code'] = $this->generateCode();
        }
        
        return $this;
    }

    protected function generateCode(): string
    {
        $prefix = 'CB';
        $lastEntry = $this->repository->getModel()
            ->where('code', 'like', $prefix . '%')
            ->orderBy('id', 'desc')
            ->first();
        
        if ($lastEntry && $lastEntry->code) {
            $lastNumber = (int) substr($lastEntry->code, strlen($prefix));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get cash book statistics
     */
    public function getStatistics(array $filters = []): array
    {
        $query = $this->repository->getModel()
            ->where('status', 'completed');
        
        // Apply date filters
        if (isset($filters['start_date'])) {
            $query->where('entry_date', '>=', $filters['start_date']);
        }
        if (isset($filters['end_date'])) {
            $query->where('entry_date', '<=', $filters['end_date']);
        }
        
        $totalIncome = (clone $query)->where('entry_type', 'income')->sum('amount');
        $totalExpense = (clone $query)->where('entry_type', 'expense')->sum('amount');
        $totalTransfer = (clone $query)->where('entry_type', 'transfer')->sum('amount');
        
        $balance = $totalIncome - $totalExpense;
        
        return [
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'total_transfer' => $totalTransfer,
            'balance' => $balance,
        ];
    }
}

