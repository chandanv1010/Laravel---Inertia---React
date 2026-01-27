<?php

namespace App\Repositories\CashBook;

use App\Repositories\BaseRepo;
use App\Models\CashTransaction;

class CashTransactionRepo extends BaseRepo {
    
    public function __construct(CashTransaction $model) {
        parent::__construct($model);
    }

    /**
     * Get balance statistics
     * According to Sapo documentation: Tồn quỹ = Số dư đầu kỳ + Tổng thu - Tổng chi
     */
    public function getBalanceStats(array $filters = []): array
    {
        $baseQuery = $this->model->where('publish', '2');
        
        // Apply store filter to base query
        if (!empty($filters['store_id'])) {
            $baseQuery->where(function($q) use ($filters) {
                $q->where('store_id', $filters['store_id'])
                  ->orWhere('recipient_store_id', $filters['store_id']);
            });
        }

        // Calculate opening balance (số dư đầu kỳ) - transactions before start_date
        $openingBalance = 0;
        $openingCashBalance = 0;
        $openingBankBalance = 0;
        
        if (!empty($filters['start_date'])) {
            $openingQuery = (clone $baseQuery)->where('transaction_date', '<', $filters['start_date']);
            
            $openingReceipt = $openingQuery->where('transaction_type', 'receipt')->sum('amount');
            $openingPayment = $openingQuery->where('transaction_type', 'payment')->sum('amount');
            $openingBalance = (float) ($openingReceipt - $openingPayment);
            
            // Opening cash balance
            $openingCashReceipt = (clone $openingQuery)->where('transaction_type', 'receipt')->where('payment_method', 'cash')->sum('amount');
            $openingCashPayment = (clone $openingQuery)->where('transaction_type', 'payment')->where('payment_method', 'cash')->sum('amount');
            $openingCashBalance = (float) ($openingCashReceipt - $openingCashPayment);
            
            // Opening bank balance
            $openingBankReceipt = (clone $openingQuery)->where('transaction_type', 'receipt')->where('payment_method', 'bank')->sum('amount');
            $openingBankPayment = (clone $openingQuery)->where('transaction_type', 'payment')->where('payment_method', 'bank')->sum('amount');
            $openingBankBalance = (float) ($openingBankReceipt - $openingBankPayment);
        }

        // Query for current period
        $query = (clone $baseQuery);
        
        // Apply date range filter
        if (!empty($filters['start_date'])) {
            $query->where('transaction_date', '>=', $filters['start_date']);
        }
        if (!empty($filters['end_date'])) {
            $query->where('transaction_date', '<=', $filters['end_date']);
        }

        // Calculate totals for current period
        $totalReceipt = (clone $query)->where('transaction_type', 'receipt')->sum('amount');
        $totalPayment = (clone $query)->where('transaction_type', 'payment')->sum('amount');
        $totalTransfer = (clone $query)->where('transaction_type', 'transfer')->sum('amount');

        $receiptCount = (clone $query)->where('transaction_type', 'receipt')->count();
        $paymentCount = (clone $query)->where('transaction_type', 'payment')->count();
        $transferCount = (clone $query)->where('transaction_type', 'transfer')->count();

        // Calculate cash balance for current period
        $cashReceipt = (clone $query)->where('transaction_type', 'receipt')->where('payment_method', 'cash')->sum('amount');
        $cashPayment = (clone $query)->where('transaction_type', 'payment')->where('payment_method', 'cash')->sum('amount');
        
        // Calculate bank balance for current period
        $bankReceipt = (clone $query)->where('transaction_type', 'receipt')->where('payment_method', 'bank')->sum('amount');
        $bankPayment = (clone $query)->where('transaction_type', 'payment')->where('payment_method', 'bank')->sum('amount');
        
        // Final balances = Opening balance + Receipt - Payment
        // According to Sapo: Tồn quỹ = Số dư đầu kỳ + Tổng thu - Tổng chi
        $currentBalance = $openingBalance + (float) $totalReceipt - (float) $totalPayment;
        $cashBalance = $openingCashBalance + (float) $cashReceipt - (float) $cashPayment;
        $bankBalance = $openingBankBalance + (float) $bankReceipt - (float) $bankPayment;

        return [
            'opening_balance' => $openingBalance,
            'total_receipt' => (float) $totalReceipt,
            'total_payment' => (float) $totalPayment,
            'total_transfer' => (float) $totalTransfer,
            'current_balance' => $currentBalance,
            'cash_balance' => $cashBalance,
            'bank_balance' => $bankBalance,
            'receipt_count' => $receiptCount,
            'payment_count' => $paymentCount,
            'transfer_count' => $transferCount,
        ];
    }

    public function pagination(
        array $column = ['*'], 
        array $condition = [], 
        int $perPage = 1,
        array $extend = [],
        array $orderBy = ['id', 'DESC'],
        array $join = [],
        array $relations = [],
        array $rawQuery = []
    ) {
        $query = $this->model->select($column);

        if(isset($condition['keyword']) && !empty($condition['keyword'])){
            $keyword = $condition['keyword'];
            $query->where(function($q) use ($keyword){
                $q->where('transaction_code', 'LIKE', '%'.$keyword.'%')
                  ->orWhere('partner_name', 'LIKE', '%'.$keyword.'%')
                  ->orWhere('reference_code', 'LIKE', '%'.$keyword.'%');
            });
            unset($condition['keyword']);
        }

        if(isset($condition['store_id']) && !empty($condition['store_id']) && $condition['store_id'] !== '0'){
            $storeId = $condition['store_id'];
            $query->where(function($q) use ($storeId){
                $q->where('store_id', $storeId)
                  ->orWhere('recipient_store_id', $storeId);
            });
            unset($condition['store_id']);
        }

        foreach($condition as $key => $val){
             if($val === null || $val === '' || $val === '0') continue;
             $query->where($key, $val);
        }
        
        // Handle customWhere
        if(isset($extend['customWhere']) && is_callable($extend['customWhere'])){
            $extend['customWhere']($query);
        }

        if(!empty($relations)){
            $query->with($relations);
        }

        $paginator = $query->orderBy($orderBy[0] ?? 'id', $orderBy[1] ?? 'DESC')->paginate($perPage);
        
        // Load partner_name from DB if partner_id exists but partner_name is null
        $paginator->getCollection()->transform(function ($transaction) {
            if ($transaction->partner_id && empty($transaction->partner_name)) {
                $partnerName = $this->getPartnerName($transaction->partner_group, $transaction->partner_id);
                if ($partnerName) {
                    // Set the attribute directly
                    $transaction->setAttribute('partner_name', $partnerName);
                }
            }
            return $transaction;
        });
        
        return $paginator;
    }
    
    /**
     * Get partner name from database based on partner_group and partner_id
     */
    protected function getPartnerName(?string $partnerGroup, ?int $partnerId): ?string
    {
        if (!$partnerGroup || !$partnerId) {
            return null;
        }
        
        try {
            switch ($partnerGroup) {
                case 'customer':
                    $customer = \App\Models\Customer::find($partnerId);
                    if ($customer) {
                        $name = trim(($customer->last_name ?? '') . ' ' . ($customer->first_name ?? ''));
                        return $name ?: $customer->email;
                    }
                    break;
                    
                case 'supplier':
                    $supplier = \App\Models\Supplier::find($partnerId);
                    if ($supplier) {
                        return $supplier->name;
                    }
                    break;
                    
                case 'employee':
                    $employee = \App\Models\User::find($partnerId);
                    if ($employee) {
                        return $employee->name ?: $employee->email;
                    }
                    break;
            }
        } catch (\Exception $e) {
            // Log error but don't break the flow
            \Log::warning("Failed to load partner name for {$partnerGroup}:{$partnerId}", [
                'error' => $e->getMessage()
            ]);
        }
        
        return null;
    }
}
