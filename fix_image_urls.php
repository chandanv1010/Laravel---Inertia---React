<?php
// Fix image/album URLs in products and product_variants
// Usage: php artisan tinker --execute="require base_path('fix_image_urls.php');"

use Illuminate\Support\Facades\DB;

// ==========================================
// Step 1: Fix products.image
// ==========================================
$imageCount = DB::table('products')
    ->whereNotNull('image')
    ->where('image', '!=', '')
    ->whereRaw("image NOT LIKE '/%' AND image NOT LIKE 'http%'")
    ->update(['image' => DB::raw("CONCAT('/', image)")]);
echo 'products.image updated: ' . $imageCount . PHP_EOL;

// ==========================================
// Step 2: Fix products.album (JSON array)
// ==========================================
$products = DB::table('products')
    ->whereNotNull('album')
    ->where('album', '!=', 'null')
    ->where('album', '!=', '[]')
    ->whereRaw("album LIKE '%\"userfiles/%'")
    ->get(['id', 'album']);
$albumCount = 0;
foreach ($products as $p) {
    $arr = json_decode($p->album, true);
    if (!is_array($arr)) continue;
    $fixed = array_map(function ($url) {
        if (!empty($url) && !str_starts_with($url, '/') && !str_starts_with($url, 'http')) {
            return '/' . $url;
        }
        return $url;
    }, $arr);
    DB::table('products')->where('id', $p->id)->update(['album' => json_encode($fixed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    $albumCount++;
}
echo 'products.album updated: ' . $albumCount . ' rows' . PHP_EOL;

// ==========================================
// Step 3: Fix product_variants.image
// ==========================================
$varImgCount = DB::table('product_variants')
    ->whereNotNull('image')
    ->where('image', '!=', '')
    ->whereRaw("image NOT LIKE '/%' AND image NOT LIKE 'http%'")
    ->update(['image' => DB::raw("CONCAT('/', image)")]);
echo 'product_variants.image updated: ' . $varImgCount . PHP_EOL;

// ==========================================
// Step 4: Fix product_variants.album (JSON array)
// ==========================================
$variants = DB::table('product_variants')
    ->whereNotNull('album')
    ->where('album', '!=', 'null')
    ->where('album', '!=', '[]')
    ->whereRaw("album LIKE '%\"userfiles/%'")
    ->get(['id', 'album']);
$varAlbumCount = 0;
foreach ($variants as $v) {
    $arr = json_decode($v->album, true);
    if (!is_array($arr)) continue;
    $fixed = array_map(function ($url) {
        if (!empty($url) && !str_starts_with($url, '/') && !str_starts_with($url, 'http')) {
            return '/' . $url;
        }
        return $url;
    }, $arr);
    DB::table('product_variants')->where('id', $v->id)->update(['album' => json_encode($fixed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    $varAlbumCount++;
}
echo 'product_variants.album updated: ' . $varAlbumCount . ' rows' . PHP_EOL;
echo 'ALL DONE!' . PHP_EOL;
