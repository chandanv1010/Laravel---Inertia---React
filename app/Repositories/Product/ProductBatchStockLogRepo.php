<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\ProductBatchStockLog;

class ProductBatchStockLogRepo extends BaseRepo {
    protected $model;

    public function __construct(
        ProductBatchStockLog $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

    /**
     * Get logs for a batch with filters
     */
    public function getLogsForBatch(int $batchId, array $filters = [])
    {
        $query = $this->model
            ->where('product_batch_id', $batchId)
            ->with('user:id,name,email')
            ->with('warehouse:id,name');

        // Filter by transaction types
        if (isset($filters['transaction_types']) && is_array($filters['transaction_types']) && count($filters['transaction_types']) > 0) {
            $query->whereIn('transaction_type', $filters['transaction_types']);
        }

        // Filter by date range
        if (isset($filters['date_from']) && isset($filters['date_to'])) {
            $query->whereBetween('created_at', [$filters['date_from'], $filters['date_to']]);
        }

        // Pagination
        $perPage = $filters['per_page'] ?? 20;
        $page = $filters['page'] ?? 1;

        return $query->orderByDesc('id')->paginate($perPage, ['*'], 'page', $page);
    }
}
