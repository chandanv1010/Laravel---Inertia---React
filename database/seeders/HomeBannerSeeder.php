<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Slide;
use Illuminate\Database\Seeder;

class HomeBannerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create home-banner
        $banner = Banner::updateOrCreate(
            ['code' => 'home-banner'],
            [
                'name' => 'Home Banner Grid',
                'code' => 'home-banner',
                'position' => 'home',
                'description' => 'Banner grid 4 items on homepage',
                'width' => 396,
                'height' => 274,
                'publish' => '2',
                'user_id' => 1,
                'order' => 1,
            ]
        );

        // Define slides data with correct SlideElement structure
        $slidesData = [
            [
                'name' => 'Everyday Fresh Meat',
                'background_image' => '/userfiles/image/banner/promotional-banner-img1.png',
                'background_color' => '#e8f4fc',
                'url' => '/san-pham?category=thit-tuoi',
                'elements' => [
                    [
                        'id' => 'title-1',
                        'type' => 'text',
                        'content' => 'Everyday Fresh',
                        'position' => ['x' => 24, 'y' => 30],
                        'size' => ['width' => 180, 'height' => 30],
                        'style' => [
                            'fontSize' => '18px',
                            'fontWeight' => '600',
                            'color' => '#0d5c8f',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                    [
                        'id' => 'subtitle-1',
                        'type' => 'text',
                        'content' => 'Meat',
                        'position' => ['x' => 24, 'y' => 55],
                        'size' => ['width' => 100, 'height' => 35],
                        'style' => [
                            'fontSize' => '26px',
                            'fontWeight' => '700',
                            'color' => '#dc2626',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                    [
                        'id' => 'price-1',
                        'type' => 'text',
                        'content' => 'Starting at $60.99',
                        'position' => ['x' => 24, 'y' => 95],
                        'size' => ['width' => 150, 'height' => 20],
                        'style' => [
                            'fontSize' => '13px',
                            'fontWeight' => '400',
                            'color' => '#374151',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                ],
                'order' => 1,
            ],
            [
                'name' => 'Daily Fresh Vegetables',
                'background_image' => '/userfiles/image/banner/promotional-banner-img2.png',
                'background_color' => '#f5f0e8',
                'url' => '/san-pham?category=rau-cu',
                'elements' => [
                    [
                        'id' => 'title-2',
                        'type' => 'text',
                        'content' => 'Daily Fresh',
                        'position' => ['x' => 24, 'y' => 30],
                        'size' => ['width' => 180, 'height' => 30],
                        'style' => [
                            'fontSize' => '18px',
                            'fontWeight' => '600',
                            'color' => '#1e3a5f',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                    [
                        'id' => 'subtitle-2',
                        'type' => 'text',
                        'content' => 'Vegetables',
                        'position' => ['x' => 24, 'y' => 55],
                        'size' => ['width' => 140, 'height' => 35],
                        'style' => [
                            'fontSize' => '26px',
                            'fontWeight' => '700',
                            'color' => '#1e3a5f',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                    [
                        'id' => 'price-2',
                        'type' => 'text',
                        'content' => 'Starting at $60.99',
                        'position' => ['x' => 24, 'y' => 95],
                        'size' => ['width' => 150, 'height' => 20],
                        'style' => [
                            'fontSize' => '13px',
                            'fontWeight' => '400',
                            'color' => '#374151',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                ],
                'order' => 2,
            ],
            [
                'name' => 'Everyday Fresh Milk',
                'background_image' => '/userfiles/image/banner/promotional-banner-img3.png',
                'background_color' => '#e0f2f7',
                'url' => '/san-pham?category=sua',
                'elements' => [
                    [
                        'id' => 'title-3',
                        'type' => 'text',
                        'content' => 'Everyday Fresh',
                        'position' => ['x' => 24, 'y' => 30],
                        'size' => ['width' => 180, 'height' => 30],
                        'style' => [
                            'fontSize' => '18px',
                            'fontWeight' => '600',
                            'color' => '#0d5c8f',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                    [
                        'id' => 'subtitle-3',
                        'type' => 'text',
                        'content' => 'Milk',
                        'position' => ['x' => 24, 'y' => 55],
                        'size' => ['width' => 100, 'height' => 35],
                        'style' => [
                            'fontSize' => '26px',
                            'fontWeight' => '700',
                            'color' => '#dc2626',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                    [
                        'id' => 'price-3',
                        'type' => 'text',
                        'content' => 'Starting at $60.99',
                        'position' => ['x' => 24, 'y' => 95],
                        'size' => ['width' => 150, 'height' => 20],
                        'style' => [
                            'fontSize' => '13px',
                            'fontWeight' => '400',
                            'color' => '#374151',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                ],
                'order' => 3,
            ],
            [
                'name' => 'Everyday Fresh Fruits',
                'background_image' => '/userfiles/image/banner/promotional-banner-img4.png',
                'background_color' => '#e8e5e0',
                'url' => '/san-pham?category=trai-cay',
                'elements' => [
                    [
                        'id' => 'title-4',
                        'type' => 'text',
                        'content' => 'Everyday Fresh',
                        'position' => ['x' => 24, 'y' => 30],
                        'size' => ['width' => 180, 'height' => 30],
                        'style' => [
                            'fontSize' => '18px',
                            'fontWeight' => '600',
                            'color' => '#1e3a5f',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                    [
                        'id' => 'subtitle-4',
                        'type' => 'text',
                        'content' => 'Fruits',
                        'position' => ['x' => 24, 'y' => 55],
                        'size' => ['width' => 100, 'height' => 35],
                        'style' => [
                            'fontSize' => '26px',
                            'fontWeight' => '700',
                            'color' => '#1e3a5f',
                            'backgroundColor' => 'transparent',
                            'textAlign' => 'left',
                        ],
                        'zIndex' => 10,
                        'animation' => [
                            'type' => 'none',
                            'duration' => 500,
                            'delay' => 0,
                            'easing' => 'ease',
                        ],
                    ],
                ],
                'order' => 4,
            ],
        ];

        // Delete existing slides for this banner and recreate
        Slide::where('banner_id', $banner->id)->forceDelete();

        // Create slides
        foreach ($slidesData as $slideData) {
            Slide::create([
                'banner_id' => $banner->id,
                'name' => $slideData['name'],
                'background_image' => $slideData['background_image'],
                'background_color' => $slideData['background_color'],
                'elements' => $slideData['elements'],
                'url' => $slideData['url'],
                'target' => '_self',
                'order' => $slideData['order'],
                'publish' => '2',
                'user_id' => 1,
            ]);
        }

        $this->command->info('Home Banner seeded successfully with 4 slides (fixed structure)!');
    }
}
