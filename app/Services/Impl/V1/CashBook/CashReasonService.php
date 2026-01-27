<?php

namespace App\Services\Impl\V1\CashBook;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\CashBook\CashReasonServiceInterface;
use App\Repositories\CashBook\CashReasonRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use App\Helpers\DropdownHelper;

class CashReasonService extends BaseCacheService implements CashReasonServiceInterface {

    // Cache strategy: 'default' cho reasons vì ít thay đổi
    protected string $cacheStrategy = 'default';
    protected string $module = 'cash_reasons';

    protected $repository;

    protected $with = [];
    protected $simpleFilter = ['publish', 'type'];
    protected $searchFields = ['name', 'description'];
    protected $sort = ['order', 'asc'];

    public function __construct(
        CashReasonRepo $repository
    )
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        return $this;
    }

    /**
     * Get dropdown data for reasons
     */
    public function getDropdown(string $type = null)
    {
        // Sử dụng trực tiếp query để tránh vấn đề với cache và filter
        $query = $this->repository->getModel()
            ->where('publish', '2')
            ->orderBy('order', 'asc');
        
        // Nếu có type và không phải 'all', filter theo type
        if ($type && $type !== 'all') {
            $query->where('type', $type);
        }
        
        $records = $query->get();

        return DropdownHelper::transform($records, [
            'valueKey' => 'id',
            'labelKey' => 'name',
            'isMultipleLanguage' => false,
        ]);
    }

    /**
     * Get reasons by type
     */
    public function getByType(string $type)
    {
        return $this->repository->getModel()
            ->where('type', $type)
            ->where('publish', '2')
            ->orderBy('order', 'asc')
            ->get();
    }

    /**
     * Get default reason for type
     */
    public function getDefaultByType(string $type)
    {
        return $this->repository->getModel()
            ->where('type', $type)
            ->where('is_default', true)
            ->where('publish', '2')
            ->first();
    }
}
