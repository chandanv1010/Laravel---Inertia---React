<?php

use Illuminate\Support\Facades\DB;

// The album JSON in DB has escaped slashes: "userfiles\/image\/..."
// We match on 'userfiles' which is enough
$products = DB::table('products')
    ->whereNotNull('album')
    ->where('album', '!=', 'null')
    ->where('album', '!=', '[]')
    ->where('album', 'LIKE', '%userfiles%')
    ->get(['id', 'album']);

echo 'products with album to fix: ' . count($products) . PHP_EOL;

$albumCount = 0;
foreach ($products as $p) {
    $arr = json_decode($p->album, true);
    if (!is_array($arr)) continue;

    $changed = false;
    $fixed = array_map(function ($url) use (&$changed) {
        if (!empty($url) && !str_starts_with($url, '/') && !str_starts_with($url, 'http')) {
            $changed = true;
            return '/' . $url;
        }
        return $url;
    }, $arr);

    if ($changed) {
        DB::table('products')->where('id', $p->id)->update([
            'album' => json_encode($fixed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        ]);
        $albumCount++;
    }
}

echo 'products.album fixed: ' . $albumCount . ' rows' . PHP_EOL;

// Verify result
$sample = DB::table('products')->whereNotNull('album')->where('album', '!=', 'null')->first(['id', 'album']);
if ($sample) {
    echo 'SAMPLE after fix - ID:' . $sample->id . ' album: ' . $sample->album . PHP_EOL;
}

echo 'DONE!' . PHP_EOL;
