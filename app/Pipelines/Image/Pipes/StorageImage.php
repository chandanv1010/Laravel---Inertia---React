<?php  
namespace App\Pipelines\Image\Pipes;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Encoders\JpegEncoder;
use InvalidArgumentException;
use RuntimeException;

class StorageImage extends AbstractImage {
    public function handle($image, \Closure $next){
        $disk = $this->options['disk'] ?? config('upload.image.disk');

        if(!isset($this->options['path'])){
            throw new InvalidArgumentException('Storage Path Không Tồn Tại');
        }

        if(!isset($image->filename)){
            throw new InvalidArgumentException('Filename là bắt buộc');
        }

        match ($disk) {
            'public' => $this->localUpload($image, $disk),
            's3' => $this->s3Upload(),
            default => throw new InvalidArgumentException("Diver Upload Không Được Hỗ Trợ: {$disk}")
        };
        return $next($image);
    }

    private function localUpload($image, $disk){
        $path = trim($this->options['path'] . $image->filename);
        $encoded = $image->encode($image->encoder ?? new JpegEncoder());
        Storage::disk($disk)->put($path, $encoded);
        $image->path = $path;
    }

    private function s3Upload(){
        throw new RuntimeException('S3 Upload chưa được hỗ trợ');
    }
}