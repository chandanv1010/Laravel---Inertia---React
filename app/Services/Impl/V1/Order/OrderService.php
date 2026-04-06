<?php  
namespace App\Services\Impl\V1\Order;

use App\Services\Impl\V1\BaseService;
use App\Services\Interfaces\Order\OrderServiceInterface;
use App\Repositories\Order\OrderRepo;
use Illuminate\Http\Request;
use App\Models\Order;

class OrderService extends BaseService implements OrderServiceInterface {
    
    protected $repository;
    protected $simpleFilter = ['payment_status', 'order_status'];
    protected $complexFilter = ['id', 'customer_id'];
    protected $searchFields = ['order_code', 'customer_name', 'customer_phone'];

    public function __construct(
        OrderRepo $repository
    )
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    /**
     * Prepare model data for save/update
     * 
     * @return static
     */
    protected function prepareModelData(): static
    {
        $this->modelData = $this->request->only([
            'order_status',
            'payment_status',
            'shipping_address',
            'notes'
        ]);
        
        return $this;
    }

    /**
     * Get order by code with relations
     * 
     * @param string $code
     * @return Order|null
     */
    public function getOrderByCode(string $code)
    {
        return $this->repository->getModel()->with(['orderItems', 'paymentMethod'])->where('order_code', $code)->first();
    }

    /**
     * Override show to include relations for Admin
     */
    public function show($id, $relations = ['orderItems', 'paymentMethod'])
    {
        return $this->repository->findById($id, ['*'], $relations);
    }
}
