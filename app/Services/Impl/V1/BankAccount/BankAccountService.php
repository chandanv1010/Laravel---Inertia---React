<?php  
namespace App\Services\Impl\V1\BankAccount;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\BankAccount\BankAccountServiceInterface;
use App\Repositories\BankAccount\BankAccountRepo;
use App\Helpers\DropdownHelper;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class BankAccountService extends BaseService implements BankAccountServiceInterface {

    protected $repository;

    protected $with = ['paymentMethod'];
    protected $simpleFilter = ['payment_method_id', 'is_active'];
    protected $searchFields = ['bank_name', 'account_number', 'account_holder_name'];
    protected $sort = ['order', 'asc'];

    public function __construct(
        BankAccountRepo $repository
    )
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        
        if(!$this->skipBeforeSave){
            $this->modelData['user_id'] = Auth::id();
        }
        
        return $this;
    }

    protected function beforeSave(): static {
        return $this;
    }

    protected function afterSave(): static {
        return parent::afterSave();
    }

    protected function withRelation(): static {
        // BankAccount không có relations cần sync, skip
        return $this;
    }

    public function getDropdown()
    {
        $request = new Request([
            'type' => 'all',
            'is_active' => '1',
            'sort' => 'order,asc'
        ]);
        $records = $this->paginate($request);
        
        $items = [];
        foreach ($records as $record) {
            $label = $record->bank_name;
            if ($record->account_number) {
                $label .= ' - ' . $record->account_number;
            }
            if ($record->account_holder_name) {
                $label .= ' (' . $record->account_holder_name . ')';
            }
            $items[] = [
                'value' => $record->id,
                'label' => $label,
            ];
        }
        
        return $items;
    }

    /**
     * Lấy danh sách tài khoản ngân hàng theo payment_method_id
     */
    public function getBankAccountsForPaymentMethod(?int $paymentMethodId = null): array
    {
        $query = $this->repository->getModel()->query();
        
        if ($paymentMethodId) {
            $query->where('payment_method_id', $paymentMethodId);
        }
        
        return $query->orderBy('order')
            ->get()
            ->map(function ($account) {
                return [
                    'id' => $account->id,
                    'bank_name' => $account->bank_name,
                    'account_number' => $account->account_number,
                    'account_holder_name' => $account->account_holder_name,
                    'note' => $account->note,
                    'is_active' => $account->is_active,
                    'order' => $account->order,
                ];
            })
            ->toArray();
    }
}

