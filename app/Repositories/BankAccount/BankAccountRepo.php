<?php  
namespace App\Repositories\BankAccount;

use App\Repositories\BaseRepo;
use App\Models\BankAccount;

class BankAccountRepo extends BaseRepo {
    
    protected $model;
    protected $relationable = []; // BankAccount không có relations cần sync

    public function __construct(
        BankAccount $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

    public function getRelationable(): array {
        return $this->relationable;
    }

}

