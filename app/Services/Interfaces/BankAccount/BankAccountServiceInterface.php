<?php

namespace App\Services\Interfaces\BankAccount;

use App\Services\Interfaces\BaseServiceInterface;

interface BankAccountServiceInterface extends BaseServiceInterface
{
    public function getDropdown();
    
    /**
     * Lấy danh sách tài khoản ngân hàng theo payment_method_id
     *
     * @param int|null $paymentMethodId
     * @return array
     */
    public function getBankAccountsForPaymentMethod(?int $paymentMethodId = null): array;
}

