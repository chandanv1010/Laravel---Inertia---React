<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Activity Tracking Enabled
    |--------------------------------------------------------------------------
    |
    | This option controls whether activity tracking is enabled or disabled.
    | When set to false, no logs will be written to the database.
    | You can set this value in your ".env" file using TRACKING_ENABLED.
    |
    */

    'enabled' => env('TRACKING_ENABLED', true),

];

