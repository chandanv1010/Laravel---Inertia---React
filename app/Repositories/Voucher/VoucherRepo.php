<?php

namespace App\Repositories\Voucher;

use App\Repositories\BaseRepo;
use App\Models\Voucher;

class VoucherRepo extends BaseRepo
{
    protected $model;
    protected $relationable = ['customer_groups', 'stores'];

    public function __construct(Voucher $model)
    {
        $this->model = $model;
        parent::__construct($model);
    }

    public function getRelationable(): array
    {
        return $this->relationable;
    }

    /**
     * Override pagination để xử lý filter expiry_status
     */
    public function pagination(array $specs = [])
    {
        $query = $this->model
            ->simpleFilter($specs['filter']['simple'] ?? [])
            ->complexFilter($specs['filter']['complex'] ?? [])
            ->dateFilter($specs['filter']['date'] ?? [])
            ->withFilter($specs['filter']['with'] ?? [])
            ->keyword($specs['filter']['keyword'] ?? []);

        // Xử lý expiry_status filter nếu có
        if (isset($specs['filter']['custom']['expiry_status'])) {
            $expiryStatus = $specs['filter']['custom']['expiry_status'];
            if (in_array($expiryStatus, ['active', 'expired'])) {
                $query->expiryStatus($expiryStatus);
            }
        }

        return $query
            ->orderBy($specs['sort'][0], $specs['sort'][1])
            ->with($specs['with'] ?? [])
            ->when(
                $specs['all'],
                fn($q) => $q->get(),
                fn($q) => $q->paginate($specs['perpage'])->withQueryString()
            );
    }
}

