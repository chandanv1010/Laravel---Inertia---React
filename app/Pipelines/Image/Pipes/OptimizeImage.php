<?php  
namespace App\Pipelines\Image\Pipes;
use Intervention\Image\Encoders\PngEncoder;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\Encoders\GifEncoder;
use Illuminate\Support\Facades\Log;

class OptimizeImage extends AbstractImage {
    public function handle($image, \Closure $next){
        try {
            if(!isset($image->filename)){
                $quality = $this->options['quality'];
                if($quality < 1 || $quality > 100){
                    $quality = 85;
                }
                $mime = $image->origin()->mediaType();
                $encoder = match ($mime) {
                    'image/jpeg' => new JpegEncoder($quality),
                    'image/png' => new PngEncoder($quality),
                    'image/gif' => new GifEncoder($quality),
                    'image/webp' => new WebpEncoder($quality),
                    default =>  new WebpEncoder($quality)
                };
            }
             return $next($image);
        } catch (\Throwable $th) {
            Log::error('GenerateFileName Pipeline Error', [
                'message' => $th->getMessage(),
                'line' => $th->getLine(),
                'file' => $th->getFile()
            ]);
            throw $th;
        }
    }
}