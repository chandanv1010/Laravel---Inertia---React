<?php   
namespace App\Services\Impl\V1\Image;

use App\Services\Interfaces\Image\ImageServiceInterface;
use Illuminate\Support\Facades\Log;
use Intervention\Image\ImageManager;
use App\Pipelines\Image\ImageManager as ImagePipeManager;
use Illuminate\Support\Facades\Storage;

class ImageService implements ImageServiceInterface{


    // protected $uploadedFiles = [];
    // protected $errors = [];
    protected $config;
    protected $imageManager;

    public function __construct(
        ImagePipeManager $imageManager
    )
    {
        $this->config = config('upload.image');
        $this->imageManager = $imageManager;

    }

    public function upload($file, $folder, $pipelineKey, array $overrideOptions = [])
    {
        try {
            if($file){
                // $this->uploadedFiles = [];
                // $this->errors = [];
                $overrideOptions['storage'] = array_merge(
                    $overrideOptions['storage'] ?? [],
                    ['path' => $this->buildPath($folder)]
                );
                $image = ImageManager::gd()->read($file);
                $image->originalFile = $file;
                $process = $this->imageManager->process($image, $pipelineKey, $overrideOptions);
                return [
                    'path' => $process->path
                ];
            }
        } catch (\Throwable $th) {
            Log::error('Upload Image: ', [
                'message' => $th->getMessage(),
                'line' => $th->getLine(),
                'file' => $th->getFile()
            ]);
            throw $th;
        }
    }

    public function deleteTempFiles($sessionId, $username)
    {
        try {
            $disk = $this->config['disk'];
            $tempFolder = $username 
                ? $this->buildPath($username. '/temp/' . $sessionId )
                : 'temp/' . $sessionId;
            
            if(Storage::disk($disk)->exists($tempFolder)){
                Storage::disk($disk)->deleteDirectory($tempFolder);
                Log::info("Deleted Temp Folder: {$tempFolder}");
                return true;
            }
            return false;

        } catch (\Throwable $th) {
           Log::error('Upload Image: ', [
                'message' => $th->getMessage(),
                'line' => $th->getLine(),
                'file' => $th->getFile(),
                'sessionId' => $sessionId
            ]);
            return false;
        }
    }

    private function buildPath(string $folder = ''): string {
        return trim($this->config['base_path']). '/' . $folder . '/';
    }

}