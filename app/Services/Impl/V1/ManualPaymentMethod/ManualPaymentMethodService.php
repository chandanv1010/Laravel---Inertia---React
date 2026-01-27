<?php  
namespace App\Services\Impl\V1\ManualPaymentMethod;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\ManualPaymentMethod\ManualPaymentMethodServiceInterface;
use App\Repositories\ManualPaymentMethod\ManualPaymentMethodRepo;
use App\Repositories\BankAccount\BankAccountRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class ManualPaymentMethodService extends BaseService implements ManualPaymentMethodServiceInterface {

    protected $repository;
    protected $bankAccountRepo;

    protected $with = ['paymentMethod', 'beneficiaryAccount'];
    protected $simpleFilter = ['payment_method_id'];
    protected $searchFields = [];
    protected $sort = ['id', 'desc'];

    public function __construct(
        ManualPaymentMethodRepo $repository,
        BankAccountRepo $bankAccountRepo
    )
    {
        $this->repository = $repository;
        $this->bankAccountRepo = $bankAccountRepo;
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
        // beneficiary_account_ids đã được lưu dưới dạng JSON array trong prepareModelData
        // Không cần sync vì không dùng pivot table
        return parent::afterSave();
    }

    protected function withRelation(): static {
        return $this;
    }

    /**
     * Lấy chi tiết manual payment method theo payment_method_id
     */
    public function getDetailsForPaymentMethod(?int $paymentMethodId = null): array
    {
        if (!$paymentMethodId) {
            return [];
        }

        $manualPaymentMethod = $this->repository->getModel()
            ->where('payment_method_id', $paymentMethodId)
            ->with('beneficiaryAccount')
            ->first();

        if (!$manualPaymentMethod) {
            return [];
        }

        $beneficiaryAccountIds = $manualPaymentMethod->beneficiary_account_ids ?? [];
        if (empty($beneficiaryAccountIds) && $manualPaymentMethod->beneficiary_account_id) {
            $beneficiaryAccountIds = [$manualPaymentMethod->beneficiary_account_id];
        }

        $beneficiaryAccounts = [];
        if (!empty($beneficiaryAccountIds)) {
            $beneficiaryAccounts = $this->bankAccountRepo->getModel()
                ->whereIn('id', $beneficiaryAccountIds)
                ->get()
                ->map(function ($account) {
                    return [
                        'id' => $account->id,
                        'bank_name' => $account->bank_name,
                        'account_number' => $account->account_number,
                        'account_holder_name' => $account->account_holder_name,
                    ];
                })
                ->toArray();
        }

        return [
            'id' => $manualPaymentMethod->id,
            'payment_method_id' => $manualPaymentMethod->payment_method_id,
            'payment_instructions' => $manualPaymentMethod->payment_instructions,
            'allow_use_when_paying' => $manualPaymentMethod->allow_use_when_paying,
            'create_receipt_immediately' => $manualPaymentMethod->create_receipt_immediately,
            'beneficiary_account_id' => $manualPaymentMethod->beneficiary_account_id,
            'beneficiary_account_ids' => $beneficiaryAccountIds,
            'beneficiary_accounts' => $beneficiaryAccounts,
            'beneficiary_account' => $manualPaymentMethod->beneficiaryAccount ? [
                'id' => $manualPaymentMethod->beneficiaryAccount->id,
                'bank_name' => $manualPaymentMethod->beneficiaryAccount->bank_name,
                'account_number' => $manualPaymentMethod->beneficiaryAccount->account_number,
            ] : null,
        ];
    }

    /**
     * Tạo hoặc cập nhật manual payment method
     */
    public function saveOrUpdate(Request $request, ?int $id = null)
    {
        $this->setRequest($request);

        if ($id) {
            $existing = $this->repository->findById($id);
            if ($existing) {
                return $this->save($request, $id);
            }
            
            $paymentMethodId = $request->input('payment_method_id');
            if (!$paymentMethodId) {
                throw new \Exception('payment_method_id is required when creating new record');
            }
            
            $existing = $this->repository->getModel()
                ->where('payment_method_id', $paymentMethodId)
                ->first();

            if ($existing) {
                return $this->save($request, $existing->id);
            }
            
            return $this->save($request);
        }

        $paymentMethodId = $request->input('payment_method_id');
        if ($paymentMethodId) {
            $existing = $this->repository->getModel()
                ->where('payment_method_id', $paymentMethodId)
                ->first();

            if ($existing) {
                return $this->save($request, $existing->id);
            }
        }

        return $this->save($request);
    }
}

