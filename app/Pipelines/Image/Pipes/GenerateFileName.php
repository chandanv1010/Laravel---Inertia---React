<?php  
namespace App\Pipelines\Image\Pipes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class GenerateFileName extends AbstractImage {
    public function handle($image, \Closure $next){
        try {
            if(!isset($image->filename)){
                $originalFileName = $image->originalFile->getClientOriginalName();
                $extension = $image->originalFile->getClientOriginalExtension();
                $image->filename = Str::uuid(). '.'.$extension;
                $image->originalFileName = $originalFileName;
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