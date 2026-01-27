<?php  
return [
    'url_type' => env('SEO_URL_TYPE', 'slug'),


    'modules' => [
        // 'posts' => 'silo',
        // 'products' => 'slug'
    ],


    'cache' => [
        'enabled' => true,
        'key_prefix' => 'seo:url_type',
        'ttl' => 86400
    ]

];