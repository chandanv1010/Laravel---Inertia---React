<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Menu;
use App\Models\MenuItem;
use Illuminate\Support\Facades\DB;

class FooterMenuSeeder extends Seeder
{
    /**
     * Tạo footer menu với các nhóm links theo design
     */
    public function run(): void
    {
        // Tạo menu footer
        $footerMenu = Menu::firstOrCreate(
            ['code' => 'footer-menu'],
            [
                'name' => 'Footer Menu',
                'position' => 'footer',
                'description' => 'Menu hiển thị ở footer website',
                'publish' => '2',
                'user_id' => 1,
                'order' => 2
            ]
        );

        $languageId = config('app.language_id', 1);

        // Định nghĩa các nhóm menu
        $menuGroups = [
            [
                'name' => 'Information',
                'children' => [
                    ['name' => 'Become a Vendor', 'url' => '/vendor'],
                    ['name' => 'Affiliate Program', 'url' => '/affiliate'],
                    ['name' => 'Privacy Policy', 'url' => '/privacy-policy'],
                    ['name' => 'Our Suppliers', 'url' => '/suppliers'],
                    ['name' => 'Extended Plan', 'url' => '/extended-plan'],
                    ['name' => 'Community', 'url' => '/community'],
                ]
            ],
            [
                'name' => 'Customer Support',
                'children' => [
                    ['name' => 'Help Center', 'url' => '/help'],
                    ['name' => 'Contact Us', 'url' => '/contact'],
                    ['name' => 'Report Abuse', 'url' => '/report'],
                    ['name' => 'Submit and Despute', 'url' => '/dispute'],
                    ['name' => 'Policies & Rules', 'url' => '/policies'],
                    ['name' => 'Online Shopping', 'url' => '/shopping-guide'],
                ]
            ],
            [
                'name' => 'My Account',
                'children' => [
                    ['name' => 'My Account', 'url' => '/account'],
                    ['name' => 'Order History', 'url' => '/orders'],
                    ['name' => 'Shopping Cart', 'url' => '/cart'],
                    ['name' => 'Compare', 'url' => '/compare'],
                    ['name' => 'Help Ticket', 'url' => '/tickets'],
                    ['name' => 'Wishlist', 'url' => '/wishlist'],
                ]
            ],
            [
                'name' => 'Daily Groceries',
                'children' => [
                    ['name' => 'Dairy & Eggs', 'url' => '/category/dairy-eggs'],
                    ['name' => 'Meat & Seafood', 'url' => '/category/meat-seafood'],
                    ['name' => 'Breakfast Food', 'url' => '/category/breakfast'],
                    ['name' => 'Household Supplies', 'url' => '/category/household'],
                    ['name' => 'Bread & Bakery', 'url' => '/category/bakery'],
                    ['name' => 'Pantry Staples', 'url' => '/category/pantry'],
                ]
            ],
        ];

        $order = 1;
        foreach ($menuGroups as $group) {
            // Tạo parent item (là header của group)
            $parentItem = MenuItem::create([
                'menu_id' => $footerMenu->id,
                'parent_id' => null,
                'name' => $group['name'],
                'url' => '#',
                'target' => '_self',
                'publish' => '2',
                'order' => $order++,
            ]);

            // Attach translation
            $parentItem->languages()->attach($languageId, [
                'name' => $group['name'],
                'url' => '#',
            ]);

            // Tạo child items
            $childOrder = 1;
            foreach ($group['children'] as $child) {
                $childItem = MenuItem::create([
                    'menu_id' => $footerMenu->id,
                    'parent_id' => $parentItem->id,
                    'name' => $child['name'],
                    'url' => $child['url'],
                    'target' => '_self',
                    'publish' => '2',
                    'order' => $childOrder++,
                ]);

                // Attach translation
                $childItem->languages()->attach($languageId, [
                    'name' => $child['name'],
                    'url' => $child['url'],
                ]);
            }
        }
    }
}
