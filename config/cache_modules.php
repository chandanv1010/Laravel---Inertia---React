<?php  
return [
    'enabled' => true,

    'ttl' => 3600,

    'ttl_paginate' => [
        'default' => 600,
        'dataset' => 3600,
        'hot_keyword' => 1800,
        'cache_all' => 300,
    ],

    'hot_keywords' => [
        'max_count' => 10,
        'min_requests' => 5,
    ],

    'lazy_cache' => [
        'enabled' => false,
        'min_hits' => 3,
        'ttl' => 600,
    ],
];