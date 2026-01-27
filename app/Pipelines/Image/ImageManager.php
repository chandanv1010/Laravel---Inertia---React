<?php  
namespace App\Pipelines\Image;
use App\Pipelines\Image\Pipes\GenerateFileName;
use App\Pipelines\Image\Pipes\OptimizeImage;
use App\Pipelines\Image\Pipes\StorageImage;
use Illuminate\Pipeline\Pipeline;

class ImageManager {

    protected $defaultPipes = [
        'generate_filename' => GenerateFileName::class,
        'optimize' => OptimizeImage::class,
        'storage' => StorageImage::class
    ];

    public function process($image, $pipelineKey, array $overrideOptions = []){
        $pipeConfig = config('upload.image.pipelines.'.$pipelineKey);
        $pipes = collect($pipeConfig)->filter(fn($config) => $config['enabled']  === true || !isset($config['enabled']))
        ->map(function($config, $pipename) use ($overrideOptions){

            $finalConfig = array_merge(
                $config,
                $overrideOptions[$pipename] ?? []
            );

            if(!($finalConfig['enabled'] ?? true)) return null;

            $class = $this->defaultPipes[$pipename] ?? null;
            if(!$class) return null;

            return new $class(array_merge(
                $config,
                $overrideOptions[$pipename] ?? []
            ));
        })->filter()->values()->toArray();

        return app(Pipeline::class)->send($image)->through($pipes)->thenReturn();

    }
}