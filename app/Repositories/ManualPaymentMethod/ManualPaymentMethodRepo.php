<?php  
namespace App\Repositories\ManualPaymentMethod;

use App\Repositories\BaseRepo;
use App\Models\ManualPaymentMethod;

class ManualPaymentMethodRepo extends BaseRepo {
    
    protected $model;
    protected $relationable = []; // ManualPaymentMethod không có relations cần sync

    public function __construct(
        ManualPaymentMethod $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

    public function getRelationable(): array {
        return $this->relationable;
    }

}

