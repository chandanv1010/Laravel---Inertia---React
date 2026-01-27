<?php

namespace Database\Seeders;

use App\Models\System;
use App\Models\SystemCatalogue;
use Illuminate\Database\Seeder;

class SystemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $userId = 1;

        // 1. Website Info
        $websiteCat = SystemCatalogue::firstOrCreate(
            ['keyword' => 'website_info'],
            ['name' => 'Thông tin chung', 'sort_order' => 1, 'user_id' => $userId, 'publish' => 1]
        );

        $this->createSystem($websiteCat->id, 'Tên website', 'website_name', 'text', 'Tên hiển thị của website', 1, $userId, 1);
        $this->createSystem($websiteCat->id, 'Logo', 'website_logo', 'image', 'Logo chính của website', 2, $userId, 0);
        $this->createSystem($websiteCat->id, 'Favicon', 'favicon', 'image', 'Icon trên tab trình duyệt', 3, $userId, 0);
        
        $statusOptions = [
            ['value' => 'open', 'label' => 'Hoạt động'],
            ['value' => 'maintain', 'label' => 'Bảo trì'],
        ];
        $this->createSystem($websiteCat->id, 'Trạng thái website', 'website_status', 'select', 'Hoạt động hoặc bảo trì', 4, $userId, 0, ['options' => $statusOptions]);
        
        $this->createSystem($websiteCat->id, 'Bản quyền', 'copyright', 'text', 'Thông tin bản quyền dưới chân trang', 5, $userId, 1);
        
        // URL Type setting for frontend links
        $urlTypeOptions = [
            ['value' => 'slug', 'label' => 'Slug (.html)'],
            ['value' => 'silo', 'label' => 'Silo (/prefix/slug.html)'],
        ];
        $this->createSystem($websiteCat->id, 'Loại đường dẫn', 'url_type', 'select', 'Định dạng URL cho frontend', 6, $userId, 0, ['options' => $urlTypeOptions]);

        // 2. Contact
        $contactCat = SystemCatalogue::firstOrCreate(
            ['keyword' => 'contact_info'],
            ['name' => 'Thông tin liên hệ', 'sort_order' => 2, 'user_id' => $userId, 'publish' => 1]
        );

        $this->createSystem($contactCat->id, 'Tên công ty', 'company_name', 'text', null, 1, $userId);
        $this->createSystem($contactCat->id, 'Địa chỉ', 'address', 'text', null, 2, $userId);
        $this->createSystem($contactCat->id, 'Hotline', 'hotline', 'text', null, 3, $userId);
        $this->createSystem($contactCat->id, 'Email', 'email', 'text', null, 4, $userId);
        $this->createSystem($contactCat->id, 'Website', 'website_link', 'text', null, 5, $userId);
        $this->createSystem($contactCat->id, 'Bản đồ', 'map', 'textarea', 'Mã iframe Google Map', 6, $userId);

        // 3. SEO
        $seoCat = SystemCatalogue::firstOrCreate(
            ['keyword' => 'seo_info'],
            ['name' => 'Cấu hình SEO', 'sort_order' => 3, 'user_id' => $userId, 'publish' => 1]
        );

        $this->createSystem($seoCat->id, 'Tiêu đề SEO', 'meta_title', 'text', null, 1, $userId);
        $this->createSystem($seoCat->id, 'Từ khóa SEO', 'meta_keyword', 'text', null, 2, $userId);
        $this->createSystem($seoCat->id, 'Mô tả SEO', 'meta_description', 'textarea', null, 3, $userId);

        // 4. Social
        $socialCat = SystemCatalogue::firstOrCreate(
            ['keyword' => 'social_info'],
            ['name' => 'Mạng xã hội', 'sort_order' => 4, 'user_id' => $userId, 'publish' => 1]
        );

        $this->createSystem($socialCat->id, 'Facebook', 'facebook', 'text', 'Link Fanpage', 1, $userId, 0);
        $this->createSystem($socialCat->id, 'Youtube', 'youtube', 'text', 'Link kênh Youtube', 2, $userId, 0);
        $this->createSystem($socialCat->id, 'Twitter', 'twitter', 'text', null, 3, $userId, 0);
        $this->createSystem($socialCat->id, 'Zalo', 'zalo', 'text', null, 4, $userId, 0);
    }

    private function createSystem($catId, $label, $keyword, $type, $desc, $sort, $userId, $isTranslatable = 1, $attributes = null)
    {
        System::firstOrCreate(
            ['keyword' => $keyword],
            [
                'system_catalogue_id' => $catId,
                'label' => $label,
                'type' => $type,
                'description' => $desc,
                'sort_order' => $sort,
                'user_id' => $userId,
                'publish' => 2,
                'is_translatable' => $isTranslatable,
                'attributes' => $attributes
            ]
        );
    }
}
