<?php

namespace App\Services\Impl\V1\Setting;

use App\Repositories\Setting\SettingRepo;
use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Setting\GeneralSettingServiceInterface;

class GeneralSettingService extends BaseCacheService implements GeneralSettingServiceInterface
{
    protected string $cacheStrategy = 'default';
    protected string $module = 'general_settings';

    protected $repository;

    public function __construct(SettingRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static
    {
        // Not used for this settings module (we persist via updateOrCreate per-key).
        $this->modelData = [];
        return $this;
    }

    /**
     * Lấy tất cả settings của group 'general'
     * @param int|null $languageId ID ngôn ngữ (null = mặc định)
     */
    public function get(?int $languageId = null): array
    {
        $query = $this->repository->getModel()
            ->where('group', 'general');
        
        if ($languageId === null) {
            $query->whereNull('language_id');
        } else {
            $query->where('language_id', $languageId);
        }
        
        $records = $query->get(['key', 'value', 'type', 'description', 'language_id']);

        $data = [];
        foreach ($records as $row) {
            $key = (string) ($row->key ?? '');
            if ($key === '') continue;
            
            // Cast value theo type
            $value = $row->value;
            switch ($row->type) {
                case 'bool':
                    $value = (bool) $value;
                    break;
                case 'int':
                    $value = (int) $value;
                    break;
                case 'float':
                    $value = (float) $value;
                    break;
                case 'string':
                    $value = (string) $value;
                    break;
                default:
                    // Giữ nguyên cho json/array
                    break;
            }
            
            $data[$key] = $value;
        }

        return $data;
    }

    /**
     * Lấy settings cho tất cả ngôn ngữ
     */
    public function getAllLanguages(): array
    {
        $records = $this->repository->getModel()
            ->where('group', 'general')
            ->get(['key', 'value', 'type', 'description', 'language_id']);

        $data = [];
        foreach ($records as $row) {
            $key = (string) ($row->key ?? '');
            if ($key === '') continue;
            
            $languageId = $row->language_id ?? 'default';
            
            // Cast value theo type
            $value = $row->value;
            switch ($row->type) {
                case 'bool':
                    $value = (bool) $value;
                    break;
                case 'int':
                    $value = (int) $value;
                    break;
                case 'float':
                    $value = (float) $value;
                    break;
                case 'string':
                    $value = (string) $value;
                    break;
                default:
                    // Giữ nguyên cho json/array
                    break;
            }
            
            if (!isset($data[$key])) {
                $data[$key] = [];
            }
            $data[$key][$languageId] = $value;
        }

        return $data;
    }

    /**
     * Cập nhật settings
     * @param array $payload Dữ liệu settings: ['key' => 'value'] hoặc ['key' => ['language_id' => 'value']]
     * @param int|null $languageId ID ngôn ngữ (null = mặc định)
     */
    public function update(array $payload, ?int $languageId = null): bool
    {
        foreach ($payload as $key => $value) {
            // Nếu value là array với language_id keys, xử lý từng language
            if (is_array($value) && (isset($value['language_id']) || array_keys($value)[0] !== 'language_id')) {
                // Format: ['key' => ['1' => 'value', '2' => 'value']] hoặc ['key' => ['default' => 'value']]
                foreach ($value as $langKey => $langValue) {
                    $langId = ($langKey === 'default' || $langKey === null) ? null : (int) $langKey;
                    
                    // Xác định type
                    $type = 'string';
                    if (is_bool($langValue)) {
                        $type = 'bool';
                    } elseif (is_int($langValue)) {
                        $type = 'int';
                    } elseif (is_float($langValue) || is_numeric($langValue)) {
                        $type = 'float';
                    } elseif (is_array($langValue) || is_object($langValue)) {
                        $type = 'json';
                    }

                    $this->repository->getModel()->updateOrCreate(
                        ['group' => 'general', 'key' => $key, 'language_id' => $langId],
                        [
                            'value' => $langValue,
                            'type' => $type,
                        ]
                    );
                }
            } else {
                // Format đơn giản: ['key' => 'value'] - lưu cho language_id được chỉ định
                // Xác định type
                $type = 'string';
                if (is_bool($value)) {
                    $type = 'bool';
                } elseif (is_int($value)) {
                    $type = 'int';
                } elseif (is_float($value) || is_numeric($value)) {
                    $type = 'float';
                } elseif (is_array($value) || is_object($value)) {
                    $type = 'json';
                }

                $this->repository->getModel()->updateOrCreate(
                    ['group' => 'general', 'key' => $key, 'language_id' => $languageId],
                    [
                        'value' => $value,
                        'type' => $type,
                    ]
                );
            }
        }

        $this->invalidateCache();
        return true;
    }

    /**
     * Lấy field definitions (metadata cho các fields)
     * Có thể mở rộng để lưu trong database hoặc config file
     */
    public function getFieldDefinitions(): array
    {
        return [
            // Thông tin website
            'website_name' => [
                'label' => 'Tên website',
                'type' => 'text',
                'group' => 'website',
                'section' => 'Thông tin website',
                'placeholder' => 'Nhập tên website',
                'required' => true,
            ],
            'website_logo' => [
                'label' => 'Logo website',
                'type' => 'image',
                'group' => 'website',
                'section' => 'Thông tin website',
                'description' => 'Logo hiển thị trên website',
                'accept' => 'image/*',
            ],
            'website_favicon' => [
                'label' => 'Favicon',
                'type' => 'image',
                'group' => 'website',
                'section' => 'Thông tin website',
                'description' => 'Icon hiển thị trên tab trình duyệt',
                'accept' => 'image/*',
            ],
            'website_status' => [
                'label' => 'Trạng thái website',
                'type' => 'select',
                'group' => 'website',
                'section' => 'Thông tin website',
                'options' => [
                    ['value' => 'active', 'label' => 'Hoạt động'],
                    ['value' => 'maintenance', 'label' => 'Bảo trì'],
                    ['value' => 'closed', 'label' => 'Đóng cửa'],
                ],
                'description' => 'Chọn trạng thái hoạt động của website',
            ],
            'website_maintenance_message' => [
                'label' => 'Thông báo bảo trì',
                'type' => 'textarea',
                'group' => 'website',
                'section' => 'Thông tin website',
                'placeholder' => 'Nhập thông báo hiển thị khi website đang bảo trì',
                'rows' => 3,
            ],

            // SEO Trang chủ
            'seo_home_title' => [
                'label' => 'Tiêu đề SEO (Title)',
                'type' => 'text',
                'group' => 'seo',
                'section' => 'SEO Trang chủ',
                'placeholder' => 'Nhập tiêu đề SEO cho trang chủ',
                'description' => 'Tiêu đề hiển thị trên tab trình duyệt và kết quả tìm kiếm',
            ],
            'seo_home_description' => [
                'label' => 'Mô tả SEO (Meta Description)',
                'type' => 'textarea',
                'group' => 'seo',
                'section' => 'SEO Trang chủ',
                'placeholder' => 'Nhập mô tả SEO cho trang chủ',
                'description' => 'Mô tả hiển thị trong kết quả tìm kiếm (tối đa 160 ký tự)',
                'rows' => 3,
                'maxLength' => 160,
            ],
            'seo_home_keywords' => [
                'label' => 'Từ khóa SEO (Keywords)',
                'type' => 'text',
                'group' => 'seo',
                'section' => 'SEO Trang chủ',
                'placeholder' => 'Nhập từ khóa, phân cách bằng dấu phẩy',
                'description' => 'Các từ khóa chính của website, phân cách bằng dấu phẩy',
            ],
            'seo_home_image' => [
                'label' => 'Ảnh đại diện SEO (OG Image)',
                'type' => 'image',
                'group' => 'seo',
                'section' => 'SEO Trang chủ',
                'description' => 'Ảnh hiển thị khi chia sẻ link trên mạng xã hội (khuyến nghị: 1200x630px)',
                'accept' => 'image/*',
            ],

            // Liên hệ
            'contact_email' => [
                'label' => 'Email liên hệ',
                'type' => 'email',
                'group' => 'contact',
                'section' => 'Thông tin liên hệ',
                'placeholder' => 'contact@example.com',
            ],
            'contact_phone' => [
                'label' => 'Số điện thoại',
                'type' => 'text',
                'group' => 'contact',
                'section' => 'Thông tin liên hệ',
                'placeholder' => '0123456789',
            ],
            'contact_address' => [
                'label' => 'Địa chỉ',
                'type' => 'textarea',
                'group' => 'contact',
                'section' => 'Thông tin liên hệ',
                'placeholder' => 'Nhập địa chỉ',
                'rows' => 3,
            ],

            // Mạng xã hội
            'social_facebook' => [
                'label' => 'Facebook',
                'type' => 'url',
                'group' => 'social',
                'section' => 'Mạng xã hội',
                'placeholder' => 'https://facebook.com/...',
            ],
            'social_youtube' => [
                'label' => 'YouTube',
                'type' => 'url',
                'group' => 'social',
                'section' => 'Mạng xã hội',
                'placeholder' => 'https://youtube.com/...',
            ],
            'social_zalo' => [
                'label' => 'Zalo',
                'type' => 'url',
                'group' => 'social',
                'section' => 'Mạng xã hội',
                'placeholder' => 'https://zalo.me/...',
            ],
        ];
    }
}

