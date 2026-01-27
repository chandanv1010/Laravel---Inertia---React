<?php

namespace App\Services\Interfaces\PaymentMethod;

use App\Services\Interfaces\BaseServiceInterface;

interface PaymentMethodServiceInterface extends BaseServiceInterface
{
    /**
     * Kết nối phương thức thanh toán tích hợp
     * 
     * @param array $data
     * @return mixed
     */
    public function connect(array $data);

    /**
     * Ngắt kết nối phương thức thanh toán tích hợp
     * 
     * @param int $id
     * @return bool
     */
    public function disconnect(int $id): bool;

    /**
     * Đặt phương thức thanh toán mặc định
     * 
     * @param int $id
     * @return bool
     */
    public function setDefault(int $id): bool;

    /**
     * Lấy danh sách phương thức tích hợp
     * 
     * @return array
     */
    public function getIntegratedMethods(): array;

    /**
     * Lấy danh sách phương thức thủ công
     * 
     * @return array
     */
    public function getManualMethods(): array;

    /**
     * Lấy phương thức thanh toán mặc định
     * 
     * @return array|null
     */
    public function getDefaultMethod(): ?array;
}

