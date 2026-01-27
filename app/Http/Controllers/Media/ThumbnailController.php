<?php

namespace App\Http\Controllers\Media;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\File;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ThumbnailController
{
    public function __invoke(Request $request)
    {
        $src = (string) $request->query('src', '');
        $w = (int) $request->query('w', 0);
        $h = (int) $request->query('h', 0);
        $fit = (string) $request->query('fit', 'crop'); // crop|contain
        $q = (int) $request->query('q', 80);

        if ($w <= 0 || $w > 2000) abort(422, 'Invalid width');
        if ($h < 0 || $h > 2000) abort(422, 'Invalid height');
        if ($q < 10 || $q > 95) $q = 80;

        // Support absolute URLs but only for same host; normalize to path.
        $path = $src;
        if (preg_match('/^https?:\\/\\//i', $src)) {
            $u = parse_url($src);
            $host = $u['host'] ?? '';
            if ($host) {
                $allowed = array_filter([
                    $request->getHost(),
                    parse_url((string) config('app.url'), PHP_URL_HOST) ?: null,
                    'localhost',
                    '127.0.0.1',
                ]);
                if (!in_array($host, $allowed, true)) {
                    abort(403, 'External image not allowed');
                }
            }
            $path = $u['path'] ?? '';
        }

        // Only allow under public/userfiles
        $path = urldecode($path);
        if (!str_starts_with($path, '/userfiles/')) {
            abort(403, 'Only /userfiles/* is allowed');
        }

        $source = public_path(ltrim($path, '/'));
        $realSource = realpath($source) ?: '';
        $realBase = realpath(public_path('userfiles')) ?: '';
        if (!$realSource || !$realBase || !str_starts_with($realSource, $realBase) || !is_file($realSource)) {
            abort(404);
        }

        $ext = strtolower(pathinfo($realSource, PATHINFO_EXTENSION));
        $format = in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true) ? $ext : 'jpg';
        if ($format === 'jpeg') $format = 'jpg';

        $sig = sha1($realSource . '|' . filemtime($realSource) . "|$w|$h|$fit|$q|$format");
        $cacheDir = storage_path('app/public/thumbs/' . substr($sig, 0, 2));
        File::ensureDirectoryExists($cacheDir);
        $cachePath = $cacheDir . '/' . $sig . '.' . $format;

        if (!is_file($cachePath)) {
            $manager = new ImageManager(new Driver());
            $img = $manager->read($realSource);

            if ($h > 0) {
                if ($fit === 'contain') {
                    $img = $img->scaleDown($w, $h);
                } else {
                    // crop to exact size
                    $img = $img->cover($w, $h);
                }
            } else {
                $img = $img->scaleDown($w);
            }

            // Encode
            $encoded = match ($format) {
                'png' => $img->toPng(),
                'webp' => $img->toWebp($q),
                default => $img->toJpeg($q),
            };

            file_put_contents($cachePath, (string) $encoded);
        }

        $mime = match ($format) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        return response()->file($cachePath, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}

