<?php

use Illuminate\Support\Facades\DB;

$samples = DB::table('products')
    ->whereNotNull('album')
    ->where('album', '!=', 'null')
    ->where('album', '!=', '[]')
    ->limit(5)
    ->get(['id', 'album']);

foreach ($samples as $s) {
    echo "ID: {$s->id} | album: {$s->album}" . PHP_EOL;
}

$total = DB::table('products')
    ->whereNotNull('album')
    ->where('album', '!=', 'null')
    ->where('album', 'LIKE', '%userfiles%')
    ->count();
echo "Total with userfiles in album: " . $total . PHP_EOL;
