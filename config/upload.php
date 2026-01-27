<?php  
return [
    'image' => [
        'disk' => 'public', // local, s3, minio --> ,
        'max_size' => 2 * 1024,
        'allow_mime_types' => [
            'jpeg',
            'jpg',
            'png',
            'webp',
            'gif',
        ],
        'base_path' => 'uploads',
        'pipelines' => [
            'default' => [
                'generate_filename' => [
                    'enabled' => true,
                ],
                'optimize' => [
                    'enabled' => false,
                    'quality' => 85
                ],
                'storage' => [
                    'enabled' => true
                ]
            ],
            'avatar' => [],
        ]
    ],
    'file' => [],
    'media' => [],
];


