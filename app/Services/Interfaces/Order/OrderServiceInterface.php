<?php  
namespace App\Services\Interfaces\Order;

use App\Services\Interfaces\BaseServiceInterface;

interface OrderServiceInterface extends BaseServiceInterface{
    public function getOrderByCode(string $code);
}
