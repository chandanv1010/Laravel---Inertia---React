<?php

namespace App\Services\Interfaces\ManualPaymentMethod;

use App\Services\Interfaces\BaseServiceInterface;
use Illuminate\Http\Request;

interface ManualPaymentMethodServiceInterface extends BaseServiceInterface
{
    /**
     * Lấy chi tiết manual payment method theo payment_method_id
     *
     * @param int|null $paymentMethodId
     * @return array
     */
    public function getDetailsForPaymentMethod(?int $paymentMethodId = null): array;
    
    /**
     * Tạo hoặc cập nhật manual payment method
     *
     * @param Request $request
     * @param int|null $id
     * @return mixed
     */
    public function saveOrUpdate(Request $request, ?int $id = null);
}

