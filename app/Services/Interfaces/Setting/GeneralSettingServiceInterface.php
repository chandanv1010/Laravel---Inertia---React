<?php

namespace App\Services\Interfaces\Setting;

interface GeneralSettingServiceInterface
{
    /**
     * Lấy tất cả settings của group 'general'
     */
    public function get(): array;

    /**
     * Cập nhật settings
     */
    public function update(array $payload): bool;

    /**
     * Lấy settings cho tất cả ngôn ngữ
     */
    public function getAllLanguages(): array;

    /**
     * Lấy field definitions (metadata cho các fields)
     */
    public function getFieldDefinitions(): array;
}

