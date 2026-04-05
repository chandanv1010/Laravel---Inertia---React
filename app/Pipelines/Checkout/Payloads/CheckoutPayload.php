<?php

namespace App\Pipelines\Checkout\Payloads;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Http\Request;

class CheckoutPayload
{
    public array $cart;
    public Customer $customer;
    public Request $request;
    
    // Results
    public ?Order $order = null;
    public string $orderCode = '';
    public array $response = [];
    public bool $isSuccess = true;
    public string $message = '';
    
    // Branching
    public string $redirectTo = 'success'; // success, payment, gateway

    /**
     * Set the raw data for the checkout process
     * 
     * @param array $cart
     * @param Customer $customer
     * @param Request $request
     * @return self
     */
    public function setData(array $cart, Customer $customer, Request $request): self
    {
        $this->cart = $cart;
        $this->customer = $customer;
        $this->request = $request;
        return $this;
    }

    /**
     * Exclude 'request' from serialization to avoid PDO errors when queued.
     * 
     * @return array
     */
    public function __sleep()
    {
        // Danh sách các thuộc tính được phép serialize (loại bỏ 'request')
        return ['cart', 'customer', 'order', 'orderCode', 'response', 'isSuccess', 'message', 'redirectTo'];
    }
}
