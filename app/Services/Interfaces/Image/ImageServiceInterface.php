<?php   
namespace App\Services\Interfaces\Image;

interface ImageServiceInterface{
    public function upload($file, $folder, $pipelineKey);
    public function deleteTempFiles($sessionId, $username);
}
